#!/bin/bash

# WooCommerce Webhook Test Script
# This script tests the webhook endpoints

# Configuration
API_URL="http://localhost:8080"
WEBHOOK_API_KEY="your-webhook-api-key-here"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "WooCommerce Webhook Integration Test"
echo "========================================"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "Testing: GET /api/webhooks/health"
echo ""
HEALTH_RESPONSE=$(curl -s -X GET "${API_URL}/api/webhooks/health")
echo "Response: $HEALTH_RESPONSE"
echo ""

if [[ $HEALTH_RESPONSE == *"\"success\":true"* ]]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""
echo "========================================"
echo ""

# Test 2: Create Order Webhook
echo -e "${YELLOW}Test 2: Order Created Webhook${NC}"
echo "Testing: POST /api/webhooks/orders"
echo ""

ORDER_PAYLOAD='{
  "event": "order.created",
  "timestamp": "2024-01-19T10:00:00+00:00",
  "data": {
    "id": 999,
    "order_number": "TEST-999",
    "status": "processing",
    "currency": "USD",
    "date_created": "2024-01-19T10:00:00+00:00",
    "total": 50.00,
    "subtotal": 45.00,
    "total_tax": 5.00,
    "total_shipping": 0.00,
    "discount_total": 0.00,
    "payment_method": "stripe",
    "payment_method_title": "Credit Card",
    "billing": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com",
      "phone": "123-456-7890",
      "address_1": "123 Test Street",
      "city": "Test City",
      "state": "CA",
      "postcode": "12345",
      "country": "US"
    },
    "shipping": {
      "first_name": "Test",
      "last_name": "User",
      "address_1": "123 Test Street",
      "city": "Test City",
      "state": "CA",
      "postcode": "12345",
      "country": "US"
    },
    "line_items": [
      {
        "id": 1,
        "name": "Test Product",
        "product_id": 101,
        "variation_id": 0,
        "quantity": 1,
        "subtotal": 45.00,
        "total": 45.00,
        "tax": 5.00,
        "sku": "TEST-SKU-001"
      }
    ],
    "shipping_lines": [],
    "tax_lines": [],
    "fee_lines": [],
    "coupon_lines": [],
    "meta_data": []
  }
}'

CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/api/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${WEBHOOK_API_KEY}" \
  -d "$ORDER_PAYLOAD")

echo "Response: $CREATE_RESPONSE"
echo ""

if [[ $CREATE_RESPONSE == *"\"success\":true"* ]]; then
  echo -e "${GREEN}✓ Order created webhook test passed${NC}"
else
  echo -e "${RED}✗ Order created webhook test failed${NC}"
fi
echo ""
echo "========================================"
echo ""

# Test 3: Order Status Changed Webhook
echo -e "${YELLOW}Test 3: Order Status Changed Webhook${NC}"
echo "Testing: POST /api/webhooks/orders"
echo ""

STATUS_PAYLOAD='{
  "event": "order.status_changed",
  "timestamp": "2024-01-19T10:30:00+00:00",
  "data": {
    "id": 999,
    "order_number": "TEST-999",
    "status": "completed",
    "currency": "USD",
    "total": 50.00,
    "subtotal": 45.00,
    "billing": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com"
    },
    "line_items": [
      {
        "id": 1,
        "name": "Test Product",
        "quantity": 1,
        "total": 45.00,
        "sku": "TEST-SKU-001"
      }
    ],
    "status_change": {
      "old_status": "processing",
      "new_status": "completed"
    }
  }
}'

STATUS_RESPONSE=$(curl -s -X POST "${API_URL}/api/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${WEBHOOK_API_KEY}" \
  -d "$STATUS_PAYLOAD")

echo "Response: $STATUS_RESPONSE"
echo ""

if [[ $STATUS_RESPONSE == *"\"success\":true"* ]]; then
  echo -e "${GREEN}✓ Order status changed webhook test passed${NC}"
else
  echo -e "${RED}✗ Order status changed webhook test failed${NC}"
fi
echo ""
echo "========================================"
echo ""

# Test 4: Invalid API Key (should fail)
echo -e "${YELLOW}Test 4: Invalid API Key (Expected to Fail)${NC}"
echo "Testing: POST /api/webhooks/orders with invalid API key"
echo ""

INVALID_RESPONSE=$(curl -s -X POST "${API_URL}/api/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid-key" \
  -d "$ORDER_PAYLOAD")

echo "Response: $INVALID_RESPONSE"
echo ""

if [[ $INVALID_RESPONSE == *"\"success\":false"* ]] || [[ $INVALID_RESPONSE == *"401"* ]]; then
  echo -e "${GREEN}✓ Invalid API key correctly rejected${NC}"
else
  echo -e "${RED}✗ Invalid API key test failed (should have been rejected)${NC}"
fi
echo ""
echo "========================================"
echo ""

# Test 5: Missing Event Field (should fail)
echo -e "${YELLOW}Test 5: Missing Required Fields (Expected to Fail)${NC}"
echo "Testing: POST /api/webhooks/orders without event field"
echo ""

INVALID_PAYLOAD='{"data": {"id": 123}}'

MISSING_RESPONSE=$(curl -s -X POST "${API_URL}/api/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${WEBHOOK_API_KEY}" \
  -d "$INVALID_PAYLOAD")

echo "Response: $MISSING_RESPONSE"
echo ""

if [[ $MISSING_RESPONSE == *"\"success\":false"* ]] || [[ $MISSING_RESPONSE == *"400"* ]]; then
  echo -e "${GREEN}✓ Missing fields correctly rejected${NC}"
else
  echo -e "${RED}✗ Missing fields test failed (should have been rejected)${NC}"
fi
echo ""
echo "========================================"
echo ""

echo -e "${YELLOW}Test Summary${NC}"
echo "All tests completed!"
echo ""
echo "Next steps:"
echo "1. Update WEBHOOK_API_KEY in this script with your actual API key"
echo "2. Ensure your server is running on ${API_URL}"
echo "3. Run the script: ./test-webhook.sh"
echo ""
echo "For authenticated endpoints (GET requests), you'll need a JWT token."
echo "Use the API documentation at ${API_URL}/api-docs to get a token."
