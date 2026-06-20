#!/bin/bash
# Create the Authentik DynamoDB single-table

TABLE_NAME="${1:-authentik}"
REGION="${2:-us-east-1}"

echo "Creating DynamoDB table: $TABLE_NAME in $REGION"

aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "Table $TABLE_NAME created successfully"
echo ""
echo "To enable TTL (for temporary share links):"
echo "  aws dynamodb update-time-to-live --table-name $TABLE_NAME --time-to-live-specification 'Enabled=true,AttributeName=ttl' --region $REGION"
