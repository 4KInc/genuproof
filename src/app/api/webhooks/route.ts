import { NextRequest, NextResponse } from "next/server";
import { putItem, getItem, queryItems } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";

// Webhook configuration — brands can register URLs to receive notifications
export async function POST(req: NextRequest) {
  try {
    const { brandId, url, events } = await req.json();

    if (!brandId || !url) {
      return NextResponse.json({ error: "brandId and url required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }

    const webhookId = uuidv4();
    const now = new Date().toISOString();

    const webhook = {
      PK: `BRAND#${brandId}`,
      SK: `WEBHOOK#${webhookId}`,
      id: webhookId,
      brandId,
      url,
      events: events || ["verification_scan", "threat_alert", "product_recall"],
      active: true,
      createdAt: now,
      lastTriggered: null,
      deliveryCount: 0,
    };

    await putItem(webhook);

    return NextResponse.json({
      id: webhookId,
      url,
      events: webhook.events,
      active: true,
    });
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId required" }, { status: 400 });
    }

    const webhooks = await queryItems(`BRAND#${brandId}`, "WEBHOOK#");

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt,
        lastTriggered: w.lastTriggered,
        deliveryCount: w.deliveryCount,
      })),
    });
  } catch (error) {
    console.error("Webhook list error:", error);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { brandId, webhookId } = await req.json();
    if (!brandId || !webhookId) {
      return NextResponse.json({ error: "brandId and webhookId required" }, { status: 400 });
    }

    // Soft delete by setting active to false
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
    const ddb = DynamoDBDocumentClient.from(client);

    await ddb.send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_TABLE || "authentik",
        Key: { PK: `BRAND#${brandId}`, SK: `WEBHOOK#${webhookId}` },
        UpdateExpression: "SET active = :f",
        ExpressionAttributeValues: { ":f": false },
      })
    );

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
