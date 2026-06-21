// Lambda: DynamoDB Streams → Threat Detection
// Triggered on every new SCAN# record in the authentik table.
// Checks for geographic anomalies, burst scanning, and hash tampering.
// Writes THREAT alerts back to DynamoDB when detected.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function handler(event) {
  const alerts = [];

  for (const record of event.Records) {
    // Only process INSERT events on SCAN# records
    if (record.eventName !== "INSERT") continue;

    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    // Unmarshall manually (stream format uses AttributeValue types)
    const sk = newImage.SK?.S || "";
    if (!sk.startsWith("SCAN#")) continue;

    const productId = newImage.productId?.S;
    const country = newImage.country?.S || "Unknown";
    const timestamp = newImage.timestamp?.S;
    const result = newImage.result?.S;

    if (!productId || !timestamp) continue;

    console.log(`Processing scan: product=${productId}, country=${country}, result=${result}`);

    // ── Check 1: Geographic Anomaly ──
    // Same product scanned from 3+ countries in 24 hours
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentScans = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": `PRODUCT#${productId}`,
            ":start": `SCAN#${dayAgo}`,
            ":end": `SCAN#${timestamp}z`,
          },
        })
      );

      const countries = new Set(
        (recentScans.Items || []).map((s) => s.country).filter(Boolean)
      );

      if (countries.size >= 3) {
        const alert = await createAlert({
          brandId: await getBrandId(productId),
          type: "geographic_anomaly",
          severity: "high",
          productId,
          details: `Product scanned from ${countries.size} countries in 24h: ${[...countries].join(", ")}`,
          timestamp,
        });
        alerts.push(alert);
        console.log(`ALERT: Geographic anomaly — ${countries.size} countries`);
      }
    } catch (err) {
      console.error("Geo check error:", err);
    }

    // ── Check 2: Burst Scanning ──
    // 10+ scans on same product within 1 hour
    try {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const hourScans = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": `PRODUCT#${productId}`,
            ":start": `SCAN#${hourAgo}`,
            ":end": `SCAN#${timestamp}z`,
          },
          Select: "COUNT",
        })
      );

      const scanCount = hourScans.Count || 0;
      if (scanCount >= 10) {
        const alert = await createAlert({
          brandId: await getBrandId(productId),
          type: "burst_scan",
          severity: "medium",
          productId,
          details: `${scanCount} scans in the last hour — possible counterfeit code testing`,
          timestamp,
        });
        alerts.push(alert);
        console.log(`ALERT: Burst scan — ${scanCount} in 1 hour`);
      }
    } catch (err) {
      console.error("Burst check error:", err);
    }

    // ── Check 3: Claim Violation ──
    // If product is claimed and scan is from a different device
    try {
      const claimResult = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PRODUCT#${productId}`, SK: "CLAIM" },
        })
      );

      if (claimResult.Item) {
        // Product is claimed — any new scan from stream means a different device might be scanning
        // (The claim check in the API already handles the fingerprint comparison,
        //  but we can flag high-volume scans on claimed products from the stream side)
        const claimedAt = claimResult.Item.claimedAt;
        const alert = await createAlert({
          brandId: await getBrandId(productId),
          type: "claimed_product_scan",
          severity: "medium",
          productId,
          details: `Scan on claimed product (claimed ${claimedAt}). Possible cloned tag in circulation.`,
          timestamp,
        });
        alerts.push(alert);
        console.log(`ALERT: Scan on claimed product`);
      }
    } catch (err) {
      console.error("Claim check error:", err);
    }

    // ── Check 4: Suspicious Result ──
    // If the verification itself returned suspicious/counterfeit
    if (result && result !== "authentic") {
      const alert = await createAlert({
        brandId: await getBrandId(productId),
        type: "hash_tampering",
        severity: "critical",
        productId,
        details: `Verification returned "${result}" — possible hash or signature tampering`,
        timestamp,
      });
      alerts.push(alert);
      console.log(`ALERT: Hash tampering — result=${result}`);
    }
  }

  console.log(`Processed ${event.Records.length} records, generated ${alerts.length} alerts`);

  return {
    statusCode: 200,
    body: JSON.stringify({ processed: event.Records.length, alerts: alerts.length }),
  };
}

// Get brandId from product record
const brandCache = new Map();
async function getBrandId(productId) {
  if (brandCache.has(productId)) return brandCache.get(productId);
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `PRODUCT#${productId}`, SK: "META" },
        ProjectionExpression: "brandId",
      })
    );
    const brandId = result.Item?.brandId || "unknown";
    brandCache.set(productId, brandId);
    return brandId;
  } catch {
    return "unknown";
  }
}

// Write a threat alert to DynamoDB
async function createAlert({ brandId, type, severity, productId, details, timestamp }) {
  const alert = {
    PK: `THREAT#${brandId}`,
    SK: `ALERT#${timestamp}#${type}`,
    GSI1PK: `BRAND#${brandId}`,
    GSI1SK: `THREAT#${timestamp}`,
    brandId,
    type,
    severity,
    productId,
    details,
    timestamp,
    resolved: false,
    source: "lambda-stream",
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: alert }));

  // Increment threat counter
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `BRAND#${brandId}`, SK: "STATS" },
      UpdateExpression: "SET threatCount = if_not_exists(threatCount, :zero) + :one",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
    })
  );

  return alert;
}
