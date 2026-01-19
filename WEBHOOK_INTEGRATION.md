# WooCommerce Webhook Integration

This document describes how to integrate WooCommerce order webhooks with the Rispit POS API.

## Overview

The POS API can receive order data from WooCommerce via webhooks. When an order is created or updated in WooCommerce, a webhook is automatically sent to your POS API, allowing for real-time inventory synchronization and order management.

## Features

- ✅ Receive order webhooks from WooCommerce
- ✅ Automatic inventory updates based on orders
- ✅ Customer data synchronization
- ✅ Order status tracking and history
- ✅ API key authentication for security
- ✅ Automatic retry mechanism (handled by WordPress)
- ✅ Order processing status tracking
- ✅ Support for both `order.created` and `order.status_changed` events

## Architecture

```
WooCommerce Store
       ↓ (webhook)
POS API Webhook Endpoint
       ↓
Process Order Data
       ↓
├─ Store in WooCommerceOrder collection
├─ Update Product Inventory
├─ Sync Customer Data
└─ Track Status Changes
```

## Setup Instructions

### 1. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Webhook API Key (for authenticating incoming webhooks)
WEBHOOK_API_KEY=your-secure-api-key-here
```

> **Important:** Use a strong, random API key. You can generate one using:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 2. Configure WordPress Plugin

Install and configure the WooCommerce POS Sync plugin in your WordPress site:

1. Install the plugin from `/wp-plugin` directory
2. Go to **WordPress Admin > POS Sync > Order Webhook Settings**
3. Configure the following:
   - **Enable Order Webhooks**: ✅ Checked
   - **Webhook URL**: `https://your-pos-api.com/api/webhooks/orders`
   - **API Key**: (Use the same key from your `.env` file)
   - **Max Retries**: 3 (default)

### 3. Test Webhook Connection

Test the webhook endpoint:

```bash
curl -X GET https://your-pos-api.com/api/webhooks/health
```

Expected response:
```json
{
  "success": true,
  "status": "ok",
  "service": "POS API - WooCommerce Webhook Receiver",
  "timestamp": "2024-01-19T10:00:00.000Z",
  "version": "1.0.0"
}
```

## API Endpoints

### 1. Receive Order Webhook (Public - API Key Required)

**Endpoint:** `POST /api/webhooks/orders`

**Headers:**
```
Content-Type: application/json
X-API-Key: your-webhook-api-key
```

**Request Body:**
```json
{
  "event": "order.created",
  "timestamp": "2024-01-19T10:00:00+00:00",
  "data": {
    "id": 123,
    "order_number": "123",
    "status": "processing",
    "currency": "USD",
    "total": 99.99,
    "subtotal": 89.99,
    "billing": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "123-456-7890"
    },
    "line_items": [
      {
        "id": 1,
        "name": "Product Name",
        "product_id": 101,
        "quantity": 2,
        "total": 59.98,
        "sku": "PROD-001"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order webhook received successfully",
  "event": "order.created",
  "order_id": 123,
  "order_number": "123",
  "wc_order_db_id": "507f1f77bcf86cd799439011"
}
```

### 2. Get All WooCommerce Orders (Authenticated)

**Endpoint:** `GET /api/webhooks/orders`

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `status` (string) - Filter by order status
- `processed` (boolean) - Filter by processed status
- `event_type` (string) - Filter by event type
- `search` (string) - Search by order number or customer

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### 3. Get Single Order (Authenticated)

**Endpoint:** `GET /api/webhooks/orders/:id`

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "wc_order_id": 123,
    "order_number": "123",
    "status": "processing",
    "total": 99.99,
    ...
  }
}
```

### 4. Get Order Statistics (Authenticated)

**Endpoint:** `GET /api/webhooks/orders/stats`

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "processed": 145,
    "pending": 5,
    "byStatus": [
      { "_id": "completed", "count": 100, "totalAmount": 15000 },
      { "_id": "processing", "count": 45, "totalAmount": 4500 }
    ],
    "recent": [...]
  }
}
```

## Webhook Events

### Event: `order.created`

Triggered when a new order is created in WooCommerce.

**Actions:**
- Store order in database
- Update product inventory (reduce stock)
- Sync customer data
- Mark as processed

### Event: `order.status_changed`

Triggered when an order status changes in WooCommerce.

**Actions:**
- Update order status
- Track status change history
- Handle status-specific logic:
  - **completed**: Mark order as fulfilled
  - **cancelled**: Restore inventory
  - **refunded**: Restore inventory and process refund
  - **processing**: Update processing status

## Data Flow

### 1. Order Created
```
WooCommerce → Webhook → POS API → Store Order → Update Inventory → Sync Customer
```

### 2. Order Status Changed
```
WooCommerce → Webhook → POS API → Update Order → Track History → Handle Status Logic
```

### 3. Order Cancelled/Refunded
```
WooCommerce → Webhook → POS API → Update Order → Restore Inventory
```

## Inventory Management

The webhook integration automatically manages inventory:

1. **Order Created**: Reduces product stock by ordered quantity
2. **Order Cancelled**: Restores product stock
3. **Order Refunded**: Restores product stock
4. **Stock Status Updates**: Automatically updates stock status (in-stock, low-stock, out-of-stock)

### Stock Status Logic

```javascript
if (stock === 0) {
  status = 'out-of-stock'
} else if (stock < lowStockThreshold) {
  status = 'low-stock'
} else {
  status = 'in-stock'
}
```

## Customer Synchronization

When an order is received, customer data is automatically synced:

- Checks if customer exists by email
- Creates new customer if not exists
- Updates existing customer data
- Links customer to order

## Security

### API Key Authentication

All webhook endpoints require an API key in the `X-API-Key` header:

```javascript
X-API-Key: your-webhook-api-key
```

**Best Practices:**
- Use a strong, random API key (32+ characters)
- Store API key securely in environment variables
- Never commit API keys to version control
- Rotate API keys periodically
- Use HTTPS in production

### Optional: HMAC Signature Validation

For additional security, you can implement HMAC signature validation:

```javascript
import { validateWebhookSignature } from '../middleware/webhookAuth.js';

// In your route
router.post('/orders', 
  validateWebhookSignature('your-hmac-secret'),
  receiveOrderWebhook
);
```

## Error Handling

### Webhook Processing Errors

If webhook processing fails, the order is still stored but marked with an error:

```json
{
  "processed": false,
  "processing_error": "Error message here"
}
```

### Retry Mechanism

The WordPress plugin handles retries automatically:
- Failed webhooks are stored in WordPress
- Retried up to 3 times (configurable)
- Retry interval: 1 hour

## Monitoring and Debugging

### Check Webhook Health

```bash
curl https://your-pos-api.com/api/webhooks/health
```

### View Order Statistics

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-pos-api.com/api/webhooks/orders/stats
```

### View Recent Orders

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-pos-api.com/api/webhooks/orders?page=1&limit=10"
```

### Check WordPress Logs

In WordPress, enable debug logging in `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Logs will be written to `wp-content/debug.log`.

## Troubleshooting

### Webhooks Not Received

1. **Check API Key**: Ensure the API key matches in both WordPress and `.env`
2. **Check URL**: Verify the webhook URL is correct and accessible
3. **Check Firewall**: Ensure your server allows incoming connections
4. **Check WordPress Logs**: Look for error messages in `wp-content/debug.log`
5. **Test Manually**: Use curl to test the endpoint

### Inventory Not Updating

1. **Check SKU Matching**: Ensure WooCommerce product SKUs match POS product SKUs
2. **Check Product Existence**: Verify products exist in POS database
3. **Check Logs**: Look for inventory update errors in console/logs
4. **Check Processing Status**: Verify order is marked as processed

### Customer Not Syncing

1. **Check Email**: Ensure customer email is valid and unique
2. **Check Customer Model**: Verify customer schema matches expected fields
3. **Check Logs**: Look for customer sync errors

### Orders Marked as Unprocessed

1. **Check Processing Errors**: Look at `processing_error` field
2. **Check Logs**: Review console/logs for detailed error messages
3. **Retry Processing**: Orders can be manually reprocessed if needed

## Testing

### Test Order Creation

```bash
curl -X POST https://your-pos-api.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-api-key" \
  -d '{
    "event": "order.created",
    "timestamp": "2024-01-19T10:00:00+00:00",
    "data": {
      "id": 999,
      "order_number": "TEST-999",
      "status": "processing",
      "currency": "USD",
      "total": 50.00,
      "subtotal": 45.00,
      "billing": {
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "phone": "123-456-7890"
      },
      "line_items": [
        {
          "id": 1,
          "name": "Test Product",
          "product_id": 101,
          "quantity": 1,
          "total": 45.00,
          "sku": "TEST-SKU-001"
        }
      ]
    }
  }'
```

### Test Order Status Change

```bash
curl -X POST https://your-pos-api.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-api-key" \
  -d '{
    "event": "order.status_changed",
    "timestamp": "2024-01-19T10:30:00+00:00",
    "data": {
      "id": 999,
      "order_number": "TEST-999",
      "status": "completed",
      "status_change": {
        "old_status": "processing",
        "new_status": "completed"
      }
    }
  }'
```

## Database Schema

### WooCommerceOrder Model

```javascript
{
  wc_order_id: Number,           // WooCommerce order ID
  order_number: String,          // Order number
  status: String,                // Order status
  currency: String,              // Currency code
  date_created: Date,            // Order creation date
  total: Number,                 // Total amount
  subtotal: Number,              // Subtotal
  billing: Object,               // Billing address
  shipping: Object,              // Shipping address
  line_items: Array,             // Order items
  event_type: String,            // Webhook event type
  processed: Boolean,            // Processing status
  processed_at: Date,            // Processing timestamp
  processing_error: String,      // Error message (if any)
  status_changes: Array,         // Status change history
  pos_sale_id: ObjectId,         // Link to POS sale (if converted)
  createdAt: Date,               // MongoDB timestamp
  updatedAt: Date                // MongoDB timestamp
}
```

## Production Deployment

### Environment Variables

```bash
# Required
WEBHOOK_API_KEY=your-secure-api-key-here
MONGODB_URI=your-mongodb-connection-string

# Optional
NODE_ENV=production
PORT=8080
```

### Nginx Configuration

```nginx
location /api/webhooks/ {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### SSL/HTTPS

Always use HTTPS in production:
- Obtain SSL certificate (Let's Encrypt recommended)
- Configure your web server to use SSL
- Update WordPress webhook URL to use `https://`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review WordPress and POS API logs
3. Test webhook endpoint manually
4. Contact support team

## Version History

- **v1.0.0** (2024-01-19)
  - Initial webhook integration
  - Order creation and status change events
  - Automatic inventory management
  - Customer synchronization
  - API key authentication
