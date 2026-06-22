// Lambda: DynamoDB Streams → Threat Detection + Gemini AI Analysis
// Triggered on every new SCAN# or EVENT# record.
// Runs rule-based anomaly checks, then Gemini for threat intelligence.

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function handler(event) {
  const alerts = [];

  for (const record of event.Records) {
    if (record.eventName !== "INSERT") continue;
    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    const sk = newImage.SK?.S || "";

    // ══ SCAN EVENTS ══
    if (sk.startsWith("SCAN#")) {
      const productId = newImage.productId?.S;
      const country = newImage.country?.S || "Unknown";
      const timestamp = newImage.timestamp?.S;
      const result = newImage.result?.S;
      if (!productId || !timestamp) continue;

      console.log(`Processing scan: product=${productId}, country=${country}, result=${result}`);

      let anomalyType = null;
      let anomalyDetails = {};

      // ── Check 1: Geographic Anomaly ──
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
        const countries = new Set((recentScans.Items || []).map((s) => s.country).filter(Boolean));
        if (countries.size >= 3) {
          anomalyType = "geographic_anomaly";
          anomalyDetails = { countries: [...countries], countryCount: countries.size, windowHours: 24 };
        }
      } catch (err) { console.error("Geo check error:", err); }

      // ── Check 2: Burst Scanning ──
      if (!anomalyType) {
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
          if ((hourScans.Count || 0) >= 10) {
            anomalyType = "burst_scan";
            anomalyDetails = { scansInHour: hourScans.Count, windowMinutes: 60 };
          }
        } catch (err) { console.error("Burst check error:", err); }
      }

      // ── Check 3: Claim Violation ──
      if (!anomalyType) {
        try {
          const claimResult = await ddb.send(
            new GetCommand({ TableName: TABLE, Key: { PK: `PRODUCT#${productId}`, SK: "CLAIM" } })
          );
          if (claimResult.Item) {
            anomalyType = "claimed_product_scan";
            anomalyDetails = { claimedAt: claimResult.Item.claimedAt, claimedBy: claimResult.Item.consumerName };
          }
        } catch (err) { console.error("Claim check error:", err); }
      }

      // ── Check 4: Suspicious Result ──
      if (!anomalyType && result && result !== "authentic") {
        anomalyType = "hash_tampering";
        anomalyDetails = { verificationResult: result };
      }

      // ── Gemini AI Threat Analysis ──
      if (anomalyType) {
        const product = await getProduct(productId);
        const brandId = await getBrandId(productId);

        let aiAnalysis = null;
        const geminiStart = Date.now();

        try {
          aiAnalysis = await callGeminiThreatAnalysis({
            anomalyType,
            anomalyDetails,
            productId,
            productName: product?.name || "Unknown",
            category: product?.category || "Unknown",
            brandName: product?.brandName || "Unknown",
            country,
            timestamp,
          });
        } catch (err) {
          console.error("Gemini call error:", err);
          // Fallback to rule-based severity
          aiAnalysis = {
            severity: anomalyType === "hash_tampering" ? "CRITICAL" : anomalyType === "geographic_anomaly" ? "HIGH" : "MEDIUM",
            attack_vector: anomalyType,
            narrative: `Anomaly detected: ${anomalyType}. ${JSON.stringify(anomalyDetails)}`,
            recommended_actions: ["Investigate the anomaly", "Contact relevant parties"],
            confidence: 50,
          };
        }

        const geminiLatency = Date.now() - geminiStart;

        // Write threat alert with AI analysis
        const alert = await createAlert({
          brandId,
          type: anomalyType,
          severity: (aiAnalysis.severity || "MEDIUM").toLowerCase(),
          productId,
          details: aiAnalysis.narrative || `Anomaly: ${anomalyType}`,
          timestamp,
          aiAnalysis: {
            severity: aiAnalysis.severity,
            attack_vector: aiAnalysis.attack_vector,
            narrative: aiAnalysis.narrative,
            recommended_actions: aiAnalysis.recommended_actions,
            confidence: aiAnalysis.confidence,
            model: "gemini-2.5-flash",
            latency_ms: geminiLatency,
          },
        });
        alerts.push(alert);

        // Write AI ops log
        await writeOpsLog({
          agent: "threat_detector",
          trigger: "scan_event",
          productId,
          brandId,
          anomalyFlags: [anomalyType],
          geminiModel: "gemini-2.5-flash",
          aiSeverity: aiAnalysis.severity,
          aiAttackVector: aiAnalysis.attack_vector,
          aiConfidence: aiAnalysis.confidence,
          latencyMs: geminiLatency,
          timestamp,
        });

        console.log(`ALERT: ${anomalyType} — AI severity: ${aiAnalysis.severity}, confidence: ${aiAnalysis.confidence}%`);
      }
    }

    // ══ PROVENANCE EVENTS — Chain Gap Detection ══
    if (sk.startsWith("EVENT#")) {
      const productId = newImage.productId?.S;
      const eventTimestamp = newImage.timestamp?.S;
      const eventType = newImage.type?.S;
      if (!productId || !eventTimestamp) continue;

      // Check for temporal gaps in the chain
      try {
        const allEvents = await ddb.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: { ":pk": `PRODUCT#${productId}`, ":prefix": "EVENT#" },
            ScanIndexForward: true,
          })
        );

        const events = allEvents.Items || [];
        if (events.length >= 2) {
          const lastTwo = events.slice(-2);
          const prevTime = new Date(lastTwo[0].timestamp).getTime();
          const currTime = new Date(lastTwo[1].timestamp).getTime();
          const gapHours = (currTime - prevTime) / (1000 * 60 * 60);

          // Flag gaps > 72 hours (3 days)
          if (gapHours > 72) {
            const product = await getProduct(productId);
            const brandId = await getBrandId(productId);
            const geminiStart = Date.now();

            let chainAnalysis = null;
            try {
              chainAnalysis = await callGeminiChainAnalysis({
                productName: product?.name || "Unknown",
                category: product?.category || "Unknown",
                gapHours: Math.round(gapHours),
                previousActor: lastTwo[0].actor,
                previousLocation: lastTwo[0].location,
                currentActor: lastTwo[1].actor,
                currentLocation: lastTwo[1].location,
                previousType: lastTwo[0].type,
                currentType: lastTwo[1].type,
              });
            } catch (err) {
              console.error("Gemini chain analysis error:", err);
              chainAnalysis = {
                risk_level: "MEDIUM",
                explanation: `${Math.round(gapHours)}-hour gap between ${lastTwo[0].actor} and ${lastTwo[1].actor}`,
                possible_causes: ["Transit delay", "Customs hold", "Warehouse staging"],
                recommended_action: "Verify chain of custody during gap period",
              };
            }

            const geminiLatency = Date.now() - geminiStart;

            await createAlert({
              brandId,
              type: "chain_gap",
              severity: (chainAnalysis.risk_level || "medium").toLowerCase(),
              productId,
              details: chainAnalysis.explanation,
              timestamp: eventTimestamp,
              aiAnalysis: {
                risk_level: chainAnalysis.risk_level,
                possible_causes: chainAnalysis.possible_causes,
                recommended_action: chainAnalysis.recommended_action,
                model: "gemini-2.5-flash",
                latency_ms: geminiLatency,
              },
            });

            await writeOpsLog({
              agent: "chain_analyzer",
              trigger: "chain_event",
              productId,
              brandId,
              anomalyFlags: ["chain_gap"],
              geminiModel: "gemini-2.5-flash",
              aiSeverity: chainAnalysis.risk_level,
              aiAttackVector: "chain_gap",
              aiConfidence: 70,
              latencyMs: geminiLatency,
              timestamp: eventTimestamp,
            });

            console.log(`CHAIN GAP: ${Math.round(gapHours)}h gap — AI risk: ${chainAnalysis.risk_level}`);
          }
        }
      } catch (err) { console.error("Chain gap check error:", err); }
    }
  }

  console.log(`Processed ${event.Records.length} records, generated ${alerts.length} alerts`);
  return { statusCode: 200, body: JSON.stringify({ processed: event.Records.length, alerts: alerts.length }) };
}

// ══ Gemini API Calls ══

async function callGeminiThreatAnalysis(context) {
  if (!GEMINI_API_KEY) throw new Error("No GEMINI_API_KEY");

  const prompt = `You are an anti-counterfeiting threat analyst for Authentik, a product authentication platform.

Analyze this scan anomaly and generate a threat intelligence report.

Context:
- Anomaly Type: ${context.anomalyType}
- Anomaly Details: ${JSON.stringify(context.anomalyDetails)}
- Product: ${context.productName} (${context.category})
- Brand: ${context.brandName}
- Scan Country: ${context.country}
- Timestamp: ${context.timestamp}

Return ONLY valid JSON with these fields:
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "attack_vector": "tag_cloning" | "burst_testing" | "geographic_distribution" | "hash_tampering" | "unauthorized_resale",
  "narrative": "2-3 sentence human-readable threat description",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "confidence": 0-100
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    }),
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

async function callGeminiChainAnalysis(context) {
  if (!GEMINI_API_KEY) throw new Error("No GEMINI_API_KEY");

  const prompt = `You are a supply chain analyst for Authentik, a product authentication platform.

A product's provenance chain shows a temporal gap. Analyze the risk.

Context:
- Product: ${context.productName} (${context.category})
- Gap: ${context.gapHours} hours between events
- Previous: ${context.previousType} by ${context.previousActor} at ${context.previousLocation}
- Current: ${context.currentType} by ${context.currentActor} at ${context.currentLocation}

Return ONLY valid JSON:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "explanation": "1-2 sentence explanation of the gap risk",
  "possible_causes": ["cause 1", "cause 2", "cause 3"],
  "recommended_action": "specific action for the brand"
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
    }),
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

// ══ Helpers ══

const brandCache = new Map();
async function getBrandId(productId) {
  if (brandCache.has(productId)) return brandCache.get(productId);
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `PRODUCT#${productId}`, SK: "META" }, ProjectionExpression: "brandId" }));
    const brandId = result.Item?.brandId || "unknown";
    brandCache.set(productId, brandId);
    return brandId;
  } catch { return "unknown"; }
}

const productCache = new Map();
async function getProduct(productId) {
  if (productCache.has(productId)) return productCache.get(productId);
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `PRODUCT#${productId}`, SK: "META" } }));
    productCache.set(productId, result.Item);
    return result.Item;
  } catch { return null; }
}

async function createAlert({ brandId, type, severity, productId, details, timestamp, aiAnalysis }) {
  // Monthly-bucketed PK: THREAT#brandId#YYYY-MM distributes writes
  // Avoids write-hot-spotting when one brand accumulates many alerts
  // GSI1 (BRAND#brandId / THREAT#timestamp) enables cross-month queries
  const monthBucket = timestamp.slice(0, 7); // YYYY-MM
  const alert = {
    PK: `THREAT#${brandId}#${monthBucket}`,
    SK: `ALERT#${timestamp}#${type}`,
    GSI1PK: `BRAND#${brandId}`,
    GSI1SK: `THREAT#${timestamp}`,
    brandId, type, severity, productId, details, timestamp,
    resolved: false,
    source: "lambda-stream",
    aiAnalysis: aiAnalysis || null,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: alert }));
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `BRAND#${brandId}`, SK: "STATS" },
    UpdateExpression: "SET threatCount = if_not_exists(threatCount, :zero) + :one",
    ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
  }));
  return alert;
}

async function writeOpsLog({ agent, trigger, productId, brandId, anomalyFlags, geminiModel, aiSeverity, aiAttackVector, aiConfidence, latencyMs, timestamp }) {
  // Time-bucketed PK: OPS_LOG#YYYY-MM-DD distributes writes across daily partitions
  // Avoids write-hot-spotting on a single OPS_LOG partition key
  const dateBucket = timestamp.slice(0, 10); // YYYY-MM-DD
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `OPS_LOG#${dateBucket}`,
      SK: `${timestamp}#${agent}`,
      GSI1PK: "OPS_LOG",
      GSI1SK: timestamp,
      agent, trigger, productId, brandId,
      anomalyFlags, geminiModel,
      aiSeverity, aiAttackVector, aiConfidence,
      latencyMs, timestamp,
    },
  }));
}
