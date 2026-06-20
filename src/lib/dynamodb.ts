import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  }),
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE || "authentik";

// ── Single-Table Design ──
// PK / SK patterns:
//
// BRAND#<brandId>          | PROFILE                    → Brand profile
// BRAND#<brandId>          | PRODUCT#<productId>        → Product record
// BRAND#<brandId>          | STATS                      → Aggregate stats
// PRODUCT#<productId>      | META                       → Product lookup by ID
// PRODUCT#<productId>      | EVENT#<timestamp>#<type>   → Provenance event
// PRODUCT#<productId>      | SCAN#<timestamp>           → Scan/verification log
// HASH#<sha256>            | META                       → Hash → product lookup
// THREAT#<brandId>         | ALERT#<timestamp>          → Threat alerts
// USER#<userId>            | PROFILE                    → User/consumer profile
//
// GSI1: GSI1PK / GSI1SK
// BRAND#<brandId>          | PRODUCT#<createdAt>        → Products by brand, sorted by date
// BRAND#<brandId>          | THREAT#<timestamp>         → Threats by brand, sorted by date
// VERIFY#<code>            | META                       → Verification code lookup

export async function putItem(item: Record<string, unknown>) {
  return ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

export async function getItem(pk: string, sk: string) {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } })
  );
  return result.Item;
}

export async function queryItems(
  pk: string,
  skPrefix?: string,
  options?: { limit?: number; scanForward?: boolean; indexName?: string }
) {
  const params: QueryCommandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? "PK = :pk AND begins_with(SK, :sk)"
      : "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": pk,
      ...(skPrefix && { ":sk": skPrefix }),
    },
    ScanIndexForward: options?.scanForward ?? false,
    ...(options?.limit && { Limit: options.limit }),
    ...(options?.indexName && { IndexName: options.indexName }),
  };

  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

export async function queryGSI1(
  gsi1pk: string,
  gsi1skPrefix?: string,
  options?: { limit?: number; scanForward?: boolean }
) {
  const params: QueryCommandInput = {
    TableName: TABLE_NAME,
    IndexName: "GSI1",
    KeyConditionExpression: gsi1skPrefix
      ? "GSI1PK = :pk AND begins_with(GSI1SK, :sk)"
      : "GSI1PK = :pk",
    ExpressionAttributeValues: {
      ":pk": gsi1pk,
      ...(gsi1skPrefix && { ":sk": gsi1skPrefix }),
    },
    ScanIndexForward: options?.scanForward ?? false,
    ...(options?.limit && { Limit: options.limit }),
  };

  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

export async function incrementCounter(
  pk: string,
  sk: string,
  field: string,
  amount: number = 1
) {
  return ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET #f = if_not_exists(#f, :zero) + :amt`,
      ExpressionAttributeNames: { "#f": field },
      ExpressionAttributeValues: { ":zero": 0, ":amt": amount },
    })
  );
}
