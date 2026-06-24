---
title: "17 Access Patterns, Zero Scans, One DynamoDB Table: Single-Table Design for a 37-Endpoint SaaS"
published: true
tags: dynamodb, aws, nextjs, vercel
series: "Building GenuProof on DynamoDB and Vercel"
---

*This post was created for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon. #H0Hackathon*

---

Single-table DynamoDB design sounds great until you have five entity types that all need to be listed, queried by different owners, and processed by a single event stream. That's where the tutorials stop and the real design work starts.

I'm building [GenuProof](https://genuproof.com), a B2B anti-counterfeiting platform on DynamoDB and Vercel. One table, 13 PK/SK patterns, 17 access patterns serving 37 API endpoints. Zero joins, zero full-table Scans on data paths, predictable cost at any scale. This post walks through every design decision.

## Why single-table?

The alternative is one table per entity: brands, products, events, scans, threats, webhooks. In DynamoDB, that means six tables, six sets of capacity settings, six sets of alarms, and no way to fetch related data in a single query without application-level joins.

Single-table design puts everything in one table with composite primary keys. You get:
- **One capacity config** to manage (PAY_PER_REQUEST in my case)
- **One DynamoDB Stream** that captures every write across all entity types
- **Transactional writes** across entities (same table = same TransactWriteItems call)
- **Simpler operations**: one table to back up, monitor, and alarm on

The cost is upfront design work. You must know your access patterns before you write a line of code.

## The access patterns

I started by listing every operation my 37 API endpoints need. Multiple endpoints share the same underlying access pattern (e.g., three different product-listing endpoints all use the same GSI1 query), which is why 37 endpoints collapse to 17 distinct patterns:

| Access Pattern | Operation |
|---|---|
| Register a brand | PutItem |
| Get brand profile | GetItem |
| List all brands | Query |
| Get brand stats | GetItem |
| Register a product (with hash and signature) | PutItem (x5 items) |
| Verify a product by code | GetItem, GetItem, Query |
| List products by brand | Query (GSI1) |
| List all products for public gallery | Query |
| Add provenance event | PutItem |
| Get provenance chain | Query |
| Record verification scan | PutItem |
| Get scan history | Query |
| Write threat alert | PutItem |
| Get threats by brand | Query (GSI1) |
| Write AI operations log | PutItem |
| Read AI ops log (last 7 days) | Query (scatter-gather) |
| Consumer claim product | PutItem |
| Health check | Scan (Limit: 1) |

That last one is the only Scan in the entire application, and it reads exactly one item to test DynamoDB connectivity.

## The schema

Here are the 13 PK/SK patterns that serve those 37 endpoints:

```
PK                               SK                          Entity
────────────────────────────────────────────────────────────────────
BRAND#<id>                       PROFILE                     Brand profile
BRAND#<id>                       STATS                       Counters (atomic)
BRAND#<id>                       WEBHOOK#<id>                Webhook config
PRODUCT#<id>                     META                        Product record
PRODUCT#<id>                     EVENT#<ts>#<type>           Provenance event
PRODUCT#<id>                     SCAN#<ts>                   Scan log
PRODUCT#<id>                     CLAIM                       Consumer lock (TTL)
VERIFY#<code>                    META                        Code to product
HASH#<sha256>                    META                        Hash to product
THREAT#<brand>#<YYYY-MM>         ALERT#<ts>#<type>           Threat alert
OPS_LOG#<YYYY-MM-DD>             <ts>#<agent>                AI ops log
BRAND_INDEX                      BRAND#<ts>#<id>             Brand listing
PRODUCT_INDEX                    PRODUCT#<ts>#<id>           Product listing
```

And one GSI (GSI1):

```
GSI1PK                           GSI1SK                      Access Pattern
────────────────────────────────────────────────────────────────────
BRAND#<id>                       PRODUCT#<ts>                Products by brand
BRAND#<id>                       THREAT#<ts>                 Threats by brand
VERIFY#<code>                    META                        Code lookup
OPS_LOG                          <ts>                        Ops across days
```

CLAIM records carry a TTL attribute so expired consumer locks are automatically cleaned up by DynamoDB, keeping the per-product item collection lean and avoiding stale claim checks on products that were never disputed.

## Key design decisions

### 1. Collection keys replace Scans

The most common DynamoDB anti-pattern in tutorials: "just Scan the table and filter." At 1,000 items, nobody notices. At 1,000,000, your Lambda times out and your bill spikes.

I needed "list all brands" and "list all products" without Scan. The solution: **collection keys**. When I register a brand, I write two items:

```javascript
// The brand itself
{ PK: "BRAND#abc", SK: "PROFILE", name: "Luxe Watches", ... }

// The collection entry
{ PK: "BRAND_INDEX", SK: "BRAND#2026-06-22T01:00:00Z#abc", name: "Luxe Watches", ... }
```

Now "list all brands" is `Query(PK = "BRAND_INDEX", ScanIndexForward = false)`, returning brands sorted by registration date, no Scan, O(n) on the result set.

Same pattern for products with `PRODUCT_INDEX`.

**Trade-off:** every registration writes one extra item. At DynamoDB's $1.25/million writes, this costs $0.00000125 per registration. Acceptable.

### 2. Verification in three hops (no joins)

The critical hot path: a consumer scans a QR code. The server must verify the product in under 100ms.

```
Step 1: GetItem(PK="VERIFY#wfPHybaFV3_a", SK="META")
        returns { productId: "e084..." }

Step 2: GetItem(PK="PRODUCT#e084...", SK="META")
        returns { hash, signature, name, brandId, ... }

Step 3: Query(PK="PRODUCT#e084...", SK begins_with "EVENT#")
        returns provenance chain, sorted by timestamp
```

Three DynamoDB operations, all on the same partition for steps 2-3. No joins, no Scans. DynamoDB returns each in single-digit milliseconds.

### 3. Atomic counters avoid read-modify-write

Brand statistics (product count, scan count, threat count) use DynamoDB's `UpdateExpression` with `ADD`:

```javascript
await ddb.send(new UpdateCommand({
  TableName: TABLE,
  Key: { PK: `BRAND#${brandId}`, SK: "STATS" },
  UpdateExpression: "SET scanCount = if_not_exists(scanCount, :zero) + :one",
  ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
}));
```

No read-before-write. No race condition. Works correctly under concurrent Lambda invocations.

### 4. GSI1 for cross-partition queries

Within a single partition, DynamoDB sorts by SK automatically. But "all products for brand X" and "all threats for brand X" live in different partitions (`PRODUCT#id` and `THREAT#brand#month`).

GSI1 solves this. Every product and threat writes `GSI1PK: "BRAND#brandId"` with a typed sort key. One GSI, two access patterns:

```javascript
// Products by brand
Query(IndexName="GSI1", GSI1PK="BRAND#abc", GSI1SK begins_with "PRODUCT#")

// Threats by brand (across all monthly buckets)
Query(IndexName="GSI1", GSI1PK="BRAND#abc", GSI1SK begins_with "THREAT#")
```

### 5. One Stream feeds the entire event pipeline

Because everything is in one table, one DynamoDB Stream captures every write. The Lambda function filters by SK prefix:

```javascript
for (const record of event.Records) {
  const sk = record.dynamodb.NewImage.SK.S;
  if (sk.startsWith("SCAN#")) { /* anomaly detection */ }
  if (sk.startsWith("EVENT#")) { /* chain gap analysis */ }
}
```

With multiple tables, you'd need multiple Streams and multiple Lambda functions. Single table means single stream means single pipeline. This is what makes the AI threat detection layer possible: the Lambda receives every scan, event, and product registration through a single stream, with no polling and no external message queue.

## The numbers

- **1 table**, PAY_PER_REQUEST
- **13 PK/SK patterns** serving 37 API endpoints
- **1 GSI** (GSI1) serving 4 cross-partition query patterns
- **0 Scans** on data paths (only health probe: Limit 1)
- **696 items**, 259 KB at demo scale
- **Sub-10ms** single-item reads, sub-50ms queries

## What I'd do differently

If I were starting over, I'd add a GSI2 for entity-type queries (`GSI2PK = "PRODUCT"`, `GSI2SK = createdAt`) instead of collection keys. GSI2 would be automatically maintained by DynamoDB, no extra writes at registration time. I chose collection keys because they work without a table migration, and I was mid-hackathon.

## Full access pattern matrix

Here's the complete matrix. 17 access patterns, zero Scans:

| Access Pattern | PK | SK | Index | Scan? |
|---|---|---|---|---|
| Register brand | `BRAND#id` / `BRAND_INDEX` | `PROFILE` / `BRAND#ts` | Table | No |
| Get brand | `BRAND#id` | `PROFILE` | Table | No |
| List brands | `BRAND_INDEX` | `begins_with(BRAND#)` | Table | No |
| Brand stats | `BRAND#id` | `STATS` | Table | No |
| Register product | `PRODUCT#id` / `VERIFY#code` / `HASH#` / `PRODUCT_INDEX` | Multiple | Table | No |
| Verify product | `VERIFY#code` then `PRODUCT#id` | `META` then `EVENT#` | Table | No |
| Products by brand | `BRAND#id` | `begins_with(PRODUCT#)` | GSI1 | No |
| Explore products | `PRODUCT_INDEX` | `begins_with(PRODUCT#)` | Table | No |
| Add event | `PRODUCT#id` | `EVENT#ts#type` | Table | No |
| Get chain | `PRODUCT#id` | `begins_with(EVENT#)` | Table | No |
| Record scan | `PRODUCT#id` | `SCAN#ts` | Table | No |
| Scan history | `PRODUCT#id` | `begins_with(SCAN#)` | Table | No |
| Write threat | `THREAT#brand#month` | `ALERT#ts` | Table | No |
| Get threats | `BRAND#id` | `begins_with(THREAT#)` | GSI1 | No |
| Write ops log | `OPS_LOG#date` | `ts#agent` | Table | No |
| Read ops log | `OPS_LOG#date` x N | scatter-gather | Table | No |
| Health check | n/a | n/a | Table | Limit:1 |

The complete source is at [github.com/4KInc/genuproof](https://github.com/4KInc/genuproof). The schema lives in `src/lib/dynamodb.ts` and the Lambda in `lambda/threat-detector.mjs`.

---

*Built for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon using DynamoDB and Vercel. #H0Hackathon*
