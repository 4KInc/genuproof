---
title: "Sharding Hot Partitions in DynamoDB: Why Your Single-Partition Log Table Will Break at Scale"
published: true
tags: dynamodb, aws, database, architecture
series: "Building GenuProof on DynamoDB and Vercel"
---

*This post was created for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon. #H0Hackathon*

---

I shipped a DynamoDB table with a hot partition and didn't notice for three weeks. At demo scale (700 items, a few writes per minute) everything worked. It would have been fine right up until it wasn't.

The anti-pattern was obvious in hindsight: every AI operation log entry was written to `PK: "OPS_LOG"`. A single partition key for an append-only, high-throughput write stream. This is the exact workload that hits DynamoDB's per-partition throughput ceiling.

Here's what I found, why it matters, and the three patterns I used to fix it, all without a table migration.

## The problem: per-partition throughput limits

DynamoDB scales horizontally by splitting data across partitions. Each partition handles:
- **3,000 RCU** (read capacity units) for eventually consistent reads
- **1,000 WCU** (write capacity units)
- **10 GB** of data

When you use PAY_PER_REQUEST (on-demand) billing mode, DynamoDB auto-scales table-level capacity. But it doesn't auto-scale *within* a partition. If all your writes hit the same partition key, you're bottlenecked at 1,000 WCU on that one partition regardless of your table-level throughput.

A note on adaptive capacity: DynamoDB does have an adaptive capacity feature that can temporarily boost a hot partition's throughput by borrowing from underutilized partitions. But adaptive capacity is a safety net, not a design strategy. It activates reactively, has limits, and doesn't eliminate the per-partition ceiling. Designing around the constraint is always better than relying on the database to compensate for a bad access pattern.

For `PK: "OPS_LOG"`, with every single AI operation landing on one partition key, this means:
- At 1 write/second: no problem
- At 100 writes/second: no problem
- At 1,001 writes/second: throttled. `ProvisionedThroughputExceededException`.

A real anti-counterfeiting platform processing scans across thousands of brands could easily hit this. And the failure mode is silent at first: DynamoDB retries internally with exponential backoff. You only see it as increased latency, then as dropped writes.

## Where I found hot partitions

I audited every PK pattern in my single-table design and found three hot spots. The simplest detection method: count the cardinality of each PK pattern. If a PK has cardinality of 1 (every write goes to the same key), it's a hot partition by definition.

### 1. OPS_LOG (AI operations telemetry)

```javascript
// BEFORE: Every AI call writes to the same PK
{
  PK: "OPS_LOG",
  SK: "2026-06-22T01:00:00Z#threat_detector",
  agent: "threat_detector",
  latencyMs: 340,
  aiSeverity: "HIGH",
  ...
}
```

**Problem:** Unbounded write concentration. Every AI classification, regardless of brand, product, or time, lands on one partition key. PK cardinality: 1.

### 2. THREAT#brandId (threat alerts)

```javascript
// BEFORE: All threats for one brand in one partition
{
  PK: "THREAT#brand-abc-123",
  SK: "ALERT#2026-06-22T01:00:00Z#geographic_anomaly",
  severity: "HIGH",
  ...
}
```

**Problem:** A brand under active counterfeiting attack generates hundreds of alerts per day. All writes concentrate on `THREAT#brand-abc-123`. The brand being attacked the hardest gets the worst write performance. Exactly backwards from what you want.

### 3. BRAND_INDEX / PRODUCT_INDEX (collection keys)

```javascript
// Collection key for "list all brands" without Scan
{
  PK: "BRAND_INDEX",
  SK: "BRAND#2026-06-22T01:00:00Z#abc",
  name: "Luxe Watches",
  ...
}
```

**Problem:** If brand registrations spike (product launch, marketing campaign), all writes hit `BRAND_INDEX`. Same issue as OPS_LOG. PK cardinality: 1.

## The fix: three sharding patterns

### Pattern 1: Time-bucketed sharding (for OPS_LOG)

Instead of a single `OPS_LOG` key, bucket writes by date:

```javascript
// AFTER: Daily-bucketed partition keys
const dateBucket = timestamp.slice(0, 10); // "2026-06-22"
{
  PK: `OPS_LOG#${dateBucket}`,       // OPS_LOG#2026-06-22
  SK: `${timestamp}#${agent}`,
  GSI1PK: "OPS_LOG",                  // For cross-day queries
  GSI1SK: timestamp,
  ...
}
```

**Write path:** Each day's ops entries go to a different partition. Today's 1,000 writes go to `OPS_LOG#2026-06-22`. Tomorrow's go to `OPS_LOG#2026-06-23`. The per-partition WCU limit applies per day, not per all-time. PK cardinality goes from 1 to 365/year.

**Read path:** The dashboard needs recent ops entries across days. Two options:

**Option A: Scatter-gather**
```javascript
// Query each daily partition in parallel
const days = 7;
const buckets = [];
for (let i = 0; i < days; i++) {
  const d = new Date(Date.now() - i * 86400000);
  buckets.push(d.toISOString().slice(0, 10));
}

const results = await Promise.all(
  buckets.map(date =>
    queryItems(`OPS_LOG#${date}`, undefined, { limit: 50, scanForward: false })
  )
);

// Merge and sort
const logs = results.flat()
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  .slice(0, limit);
```

7 parallel queries, each hitting a different partition. DynamoDB handles them concurrently. Total latency is the slowest single query, typically under 20ms.

**Option B: GSI1 query**
```javascript
// Single query across all days via GSI
const logs = await queryGSI1("OPS_LOG", undefined, { limit: 50, scanForward: false });
```

The GSI1 projection has `GSI1PK: "OPS_LOG"` across all daily partitions. This re-concentrates reads on one GSI partition key, but reads are less critical than writes (3,000 RCU vs 1,000 WCU limit), and the dashboard is low-frequency.

I use scatter-gather as the primary path and GSI1 as a fallback.

### Pattern 2: Month-bucketed sharding (for THREAT)

Threats are read by brand, so the bucket needs to include the brand ID:

```javascript
// AFTER: Monthly-bucketed by brand
const monthBucket = timestamp.slice(0, 7); // "2026-06"
{
  PK: `THREAT#${brandId}#${monthBucket}`,   // THREAT#abc#2026-06
  SK: `ALERT#${timestamp}#${type}`,
  GSI1PK: `BRAND#${brandId}`,               // Cross-month queries
  GSI1SK: `THREAT#${timestamp}`,
  ...
}
```

**Why monthly, not daily?** Threats are lower volume than ops logs. A busy brand might get 10-50 threats per day. Monthly bucketing is sufficient to prevent hot-spotting while keeping the scatter-gather read path manageable (query last 3 months = 3 parallel queries vs 90 for daily).

**Read path:** GSI1 query on `BRAND#brandId` with SK prefix `THREAT#` returns threats across all monthly buckets, sorted by timestamp, no scatter-gather needed:

```javascript
const threats = await queryGSI1(`BRAND#${brandId}`, "THREAT#", {
  limit: 50,
  scanForward: false,
});
```

This is the ideal pattern: shard writes on the base table, unify reads on a GSI.

### Pattern 3: Accept the trade-off (for collection keys)

`BRAND_INDEX` and `PRODUCT_INDEX` are also single-partition keys. But brand and product registration is low-throughput: maybe 50 per day during a hackathon, maybe 500 per day in production. The 1,000 WCU per-partition limit won't be hit.

**The decision:** Don't shard collection keys. The engineering cost of scatter-gather reads on "list all brands" isn't justified when registration throughput will never approach the partition limit.

If it did (say, an enterprise customer bulk-importing 10,000 products via the batch endpoint), I'd switch to `PRODUCT_INDEX#<shard>` with N-way random sharding:

```javascript
const shard = Math.floor(Math.random() * 10);
{
  PK: `PRODUCT_INDEX#${shard}`,  // Random distribution across 10 partitions
  SK: `PRODUCT#${timestamp}#${id}`,
  ...
}
```

Read path: scatter-gather across shards 0-9, merge, sort. But I don't need this today. YAGNI applies to partition sharding too.

## How to detect hot partitions

### 1. Count your PK cardinality

The simplest check, no monitoring required. Read every `PutItem` and `UpdateCommand` in your codebase. For each one, ask:
- **Is this PK cardinality bounded or unbounded?** `PRODUCT#uuid` = unbounded (good). `OPS_LOG` = bounded to 1 (bad).
- **Does this PK receive burst traffic?** A PK that gets 1 write/hour is fine even if it's singleton. A PK that gets 1,000 writes/second needs sharding.
- **What's the growth rate?** A PK with 100 items forever is different from a PK that grows by 1,000 items/day.

### 2. CloudWatch Contributor Insights

Enable **Contributor Insights** on the table. It shows the top-N partition keys by consumed capacity. If one PK is 80% of your write traffic, you have a hot partition even if you're not throttled yet. `ThrottledRequests` per table only fires after you're already impacted. Contributor Insights catches the problem before it hurts.

### 3. Write a risk matrix

Document every write operation with its PK. If you see the same PK in multiple write paths, that's a convergence signal:

| Write Operation | PK | Risk |
|---|---|---|
| Register brand | `BRAND#uuid` | Low: unique per brand |
| Register product | `PRODUCT#uuid` | Low: unique per product |
| Record scan | `PRODUCT#uuid` | Medium: popular products get many scans |
| Write threat | `THREAT#brand#month` | Low: monthly bucketing distributes |
| Write ops log | `OPS_LOG#date` | Low: daily bucketing distributes |
| Brand index | `BRAND_INDEX` | Low: registration is low-throughput |

If the Risk column says "High" for anything, shard it.

## Summary: the three decisions

| Hot Partition | Pattern | Bucket Size | Read Strategy |
|---|---|---|---|
| OPS_LOG | Time-bucketed | Daily | Scatter-gather (7 parallel queries) |
| THREAT#brand | Time-bucketed | Monthly | GSI1 query (single partition) |
| BRAND_INDEX | Accepted | N/A | Single partition query |

The fix for OPS_LOG was 8 lines in the Lambda writer and 15 lines in the API reader. No table migration. No GSI rebuild. No downtime. The monthly THREAT bucketing was similarly surgical: change the PK format in the Lambda and switch the reader to GSI1.

That's the beauty of DynamoDB's schemaless design: you can change your partition key format mid-stream without touching existing data. New writes go to the new pattern; old data stays readable through legacy fallback queries. You don't need a migration. You need a new PutItem and a Query that checks both patterns.

## The code

All changes are in a single commit: [`refactor: shard hot partitions, eliminate Scans, document access patterns`](https://github.com/4KInc/genuproof).

Key files:
- `lambda/threat-detector.mjs`: OPS_LOG daily bucketing and THREAT monthly bucketing
- `src/app/api/ops-log/route.ts`: scatter-gather read across daily buckets
- `src/app/api/threats/route.ts`: GSI1 read across monthly buckets
- `src/lib/dynamodb.ts`: updated schema documentation

---

*Built for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon using DynamoDB and Vercel. #H0Hackathon*
