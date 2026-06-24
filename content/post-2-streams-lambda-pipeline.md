---
title: "DynamoDB Streams and Lambda for Real-Time Threat Detection: The Event Pipeline DynamoDB Was Built For"
published: true
tags: dynamodb, aws, lambda, serverless
series: "Building GenuProof on DynamoDB and Vercel"
---

*This post was created for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon. #H0Hackathon*

---

A consumer scans a product's QR code. Five seconds later, a threat alert appears on the brand's dashboard, no page refresh, no polling. The entire pipeline is DynamoDB Streams firing a Lambda, writing a threat alert back to DynamoDB, and pushing it to the browser via Server-Sent Events.

This post walks through the complete pipeline I built for [GenuProof](https://genuproof.com), an anti-counterfeiting platform running on DynamoDB and Vercel. Every component is serverless. Cost at zero traffic: $0.

## The architecture

```
Consumer scans QR > Vercel API Route > DynamoDB PutItem (SCAN# record)
                                              |
                                              v
                                    DynamoDB Stream (NEW_IMAGE)
                                              |
                                              v
                                    Lambda: authentik-threat-detector
                                      |-- Geographic anomaly check
                                      |-- Burst scan detection
                                      |-- Claim violation check
                                      |-- Hash tampering check
                                              |
                                         (if anomaly)
                                              |
                                              v
                                    DynamoDB PutItem (THREAT# alert)
                                              |
                                              v
                                    SSE endpoint polls THREAT#
                                              |
                                              v
                                    Brand dashboard updates (no refresh)
```

## Step 1: The scan write triggers the Stream

When a consumer verifies a product, the Vercel API route writes a scan record:

```javascript
const scanRecord = {
  PK: `PRODUCT#${productId}`,
  SK: `SCAN#${new Date().toISOString()}`,
  productId,
  timestamp: now,
  ip,
  country: geo.country,
  city: geo.city,
  userAgent: req.headers.get("user-agent"),
  result: hashMatch && signatureValid ? "authentic" : "suspicious",
};
await putItem(scanRecord);
```

This write hits DynamoDB. Because Streams is enabled with `NEW_IMAGE` view type, DynamoDB emits a stream record containing the complete new item. The stream record goes to a shard, and our Lambda function is subscribed to that shard.

## Step 2: Lambda receives the stream event

The Lambda function is configured as a DynamoDB Stream trigger:
- **Batch size:** 10 (process up to 10 records per invocation)
- **Batching window:** 5 seconds (wait up to 5s to fill the batch)
- **Starting position:** LATEST

```javascript
export async function handler(event) {
  for (const record of event.Records) {
    if (record.eventName !== "INSERT") continue;

    const newImage = record.dynamodb.NewImage;
    const sk = newImage.SK.S;

    // Only process scan records and provenance events
    if (sk.startsWith("SCAN#")) {
      await processScan(newImage);
    } else if (sk.startsWith("EVENT#")) {
      await processEvent(newImage);
    }
  }
}
```

Key detail: the Lambda filters by SK prefix. Because this is a single-table design, the Stream contains writes for *all* entity types: brand profiles, product registrations, webhook configs. The Lambda ignores everything except `SCAN#` and `EVENT#` records. This filtering happens in application code, not at the Stream level, which means we pay for Lambda invocations on non-scan writes. At our scale, this is negligible. At very high write volume, you'd use [DynamoDB Stream event filtering](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html) to filter at the infrastructure level.

## Step 3: Anomaly detection (four checks)

For each scan record, the Lambda runs four sequential anomaly checks:

### Geographic anomaly

```javascript
// Query recent scans for this product (last 24 hours)
const recentScans = await ddb.send(new QueryCommand({
  TableName: TABLE,
  KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":pk": `PRODUCT#${productId}`,
    ":start": `SCAN#${twentyFourHoursAgo}`,
    ":end": `SCAN#${now}`,
  },
}));

const countries = new Set(recentScans.Items.map(s => s.country.S));
if (countries.size >= 3) {
  // Same product scanned from 3 or more countries in 24h
  anomalyType = "geographic_anomaly";
}
```

This is the pattern DynamoDB was built for: range query within a partition, sorted by timestamp. The SK `SCAN#2026-06-22T01:00:00Z` sorts lexicographically as a timestamp. The `BETWEEN` query returns only scans in the 24-hour window, no filter expression needed, no wasted read capacity.

An important subtlety: **DynamoDB Streams delivers records in order within a shard**. This ordering guarantee is what makes burst detection correct. If scans arrived out of order, we couldn't reliably count "10 scans in the last hour" because the window would be inconsistent. Streams' per-shard ordering means the Lambda always sees scans in the sequence they were written.

### Burst scan detection

```javascript
const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
const recentHourScans = recentScans.Items.filter(
  s => s.timestamp.S > oneHourAgo
);
if (recentHourScans.length >= 10) {
  anomalyType = "burst_scan";
}
```

Ten or more scans of the same product in one hour suggests someone is testing a cloned QR code, trying different devices and locations to see if the system catches them.

### Claim violation

```javascript
const claim = await ddb.send(new GetCommand({
  TableName: TABLE,
  Key: { PK: `PRODUCT#${productId}`, SK: "CLAIM" },
}));
if (claim.Item) {
  // Product already claimed by a consumer, new scan from different device
  anomalyType = "claimed_product_scan";
}
```

This is a GetItem: one partition read, one RCU. The `CLAIM` record was written when the original consumer claimed the product. Any subsequent scan from a different device fingerprint is suspicious.

### Hash tampering

```javascript
if (verificationResult !== "authentic") {
  anomalyType = "hash_tampering";
}
```

If the scan record itself shows the product failed hash verification, something is fundamentally wrong: either the database was tampered with or the product record was modified. CRITICAL severity.

## Step 4: Write the threat alert

If any check fires, the Lambda writes a threat alert back to DynamoDB:

```javascript
const monthBucket = timestamp.slice(0, 7); // "2026-06"
const alert = {
  PK: `THREAT#${brandId}#${monthBucket}`,
  SK: `ALERT#${timestamp}#${type}`,
  GSI1PK: `BRAND#${brandId}`,
  GSI1SK: `THREAT#${timestamp}`,
  brandId, type, severity, productId, details, timestamp,
  resolved: false,
  source: "lambda-stream",
};
await ddb.send(new PutCommand({ TableName: TABLE, Item: alert }));
```

Note the monthly-bucketed PK: `THREAT#brandId#2026-06`. If we used `THREAT#brandId` as a flat PK, a brand that generates thousands of threat alerts would create a write-hot partition, all writes concentrating on one partition key. Monthly bucketing distributes writes across time-based partitions. (I wrote a separate post on [sharding hot partitions](https://dev.to/karanheart96) if you want the full breakdown.)

The `GSI1PK: "BRAND#brandId"` projection means we can query all threats for a brand across monthly buckets with a single GSI1 query, no scatter-gather needed on the read path.

## Step 5: SSE pushes to the dashboard

The final piece: getting the alert to the brand's browser without polling from the client side.

The Vercel API has an SSE (Server-Sent Events) endpoint that the dashboard connects to:

```javascript
// Client (React component)
const source = new EventSource(`/api/stream?brandId=${brandId}`);
source.addEventListener("threat", (e) => {
  const threat = JSON.parse(e.data);
  setThreats(prev => [threat, ...prev]);
});
```

The server-side SSE endpoint queries DynamoDB every 3 seconds for new threats newer than the last timestamp:

```javascript
const threats = await queryGSI1(`BRAND#${brandId}`, `THREAT#${lastTimestamp}`, {
  limit: 10,
  scanForward: true,
});
for (const threat of threats) {
  controller.enqueue(encoder.encode(`event: threat\ndata: ${JSON.stringify(threat)}\n\n`));
  lastTimestamp = threat.timestamp;
}
```

The total latency from scan-to-dashboard:
1. **PutItem scan record:** ~5ms
2. **Stream delivery to Lambda:** ~100-500ms
3. **Lambda anomaly checks:** ~50-200ms (includes DynamoDB queries)
4. **PutItem threat alert:** ~5ms
5. **SSE poll interval:** up to 3s

**Total:** under 5 seconds from QR scan to dashboard alert.

## Error handling and retry guarantees

What happens when the Lambda fails mid-execution? DynamoDB Streams has built-in retry:

- **At-least-once delivery:** if the Lambda throws, DynamoDB retries the same batch. The function must be idempotent (writing a threat alert with the same PK/SK is a no-op PutItem, naturally idempotent).
- **Ordering preserved on retry:** retries deliver the same records in the same order within the shard. Your anomaly detection logic sees a consistent sequence regardless of how many retries occurred.
- **Bisect on error:** if a batch consistently fails, DynamoDB splits it in half and retries each half separately, isolating the poisoned record.

The Lambda doesn't need a dead-letter queue at our scale. If a record genuinely can't be processed after retries, it ages out of the 24-hour Stream retention window. No scan goes unprocessed silently: the scan record itself is already in DynamoDB, and the anomaly detection runs again on the next scan for the same product.

## Why DynamoDB Streams (not SQS, not EventBridge)

The alternative architecture would be: write to DynamoDB, then separately publish to SQS or EventBridge, then subscribe a Lambda, then write the alert back. That's three services instead of one.

DynamoDB Streams collapses the first two into a built-in feature. The advantages over a separate message bus:

- **Zero infrastructure:** no queue to create, no dead-letter queue to configure, no IAM policies for cross-service access
- **Guaranteed delivery:** every successful DynamoDB write generates a stream record. No "forgot to publish" bugs.
- **Ordered processing:** records arrive in write order within a shard. SQS standard queues don't guarantee ordering. SQS FIFO queues do, but require explicit deduplication IDs.
- **Same-table writes:** the Lambda reads from DynamoDB and writes back to the same table. One set of credentials, one IAM policy, one table.
- **Cost: $0 at rest.** No base cost when nobody is scanning. Lambda charges only for invocations.

## The Lambda function

The full Lambda is 412 lines. Here's what each section does:

| Lines | Function | Purpose |
|---|---|---|
| 1-20 | Setup | DynamoDB client, env vars, table name |
| 21-40 | handler() | Stream record iteration, SK filtering |
| 41-106 | anomalyChecks() | Four detection checks |
| 108-250 | processScan() | Orchestrates checks and writes |
| 252-355 | AI integration | Classification (downstream consumer of the pipeline) |
| 356-397 | writeAlert() | Threat alert with monthly bucketing |
| 400-412 | writeOpsLog() | Telemetry with daily bucketing |

The complete source is in `lambda/threat-detector.mjs` at [github.com/4KInc/genuproof](https://github.com/4KInc/genuproof).

## Stream configuration

| Setting | Value | Why |
|---|---|---|
| View type | NEW_IMAGE | Need the full item to run anomaly checks |
| Batch size | 10 | Process multiple scans per invocation to reduce Lambda cold starts |
| Batching window | 5 seconds | Allows batching during burst periods |
| Starting position | LATEST | Only process new writes, not historical data |
| Retry | 2 | Retry failed batches (Streams guarantees ordering within retry) |

## What I learned

1. **Single-table design with Streams is the canonical DynamoDB architecture.** One table gives you one Stream. One Stream gives you one event pipeline. The simplicity is the point.

2. **Filter in application code, not infrastructure** (at small scale). At large scale, use Lambda event source filtering to avoid paying for irrelevant invocations.

3. **Monthly-bucketed threat partitions** were a late addition after I realized the flat `THREAT#brandId` PK would hot-spot. The fix took 30 minutes and required zero table migration: change the PK format in the Lambda writer and switch the reader to GSI1.

4. **SSE is underrated** for real-time features. It's simpler than WebSockets, works through CDNs, and the 3-second poll against DynamoDB costs essentially nothing at demo scale.

5. **Streams ordering enables correctness, not just convenience.** Burst detection, geographic anomaly windows, and claim violation checks all depend on seeing scans in the order they were written. Without Streams' per-shard ordering guarantee, you'd need application-level sequencing.

---

*Built for the [H0: Hack the Zero Stack](https://h01.devpost.com) hackathon using DynamoDB and Vercel. #H0Hackathon*
