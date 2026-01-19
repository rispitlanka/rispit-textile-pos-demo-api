# Quick Setup Guide - WooCommerce Webhook Integration

This guide will help you set up the WooCommerce webhook integration with your POS API in 5 minutes.

## Prerequisites

- ✅ WordPress site with WooCommerce installed
- ✅ WooCommerce POS Sync plugin installed (from `/wp-plugin` directory)
- ✅ POS API server running
- ✅ Access to edit environment variables

## Step-by-Step Setup

### Step 1: Generate API Key

Generate a secure API key for webhook authentication:

```bash
# On Mac/Linux
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online generator
# https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
```

**Example output:**
```
a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz
```

### Step 2: Configure POS API Environment

Add the API key to your `.env` file:

```bash
# Navigate to your POS API directory
cd /path/to/rispit-pos-demo-api

# Edit .env file
nano .env  # or use your preferred editor
```

Add this line (replace with your generated key):

```bash
WEBHOOK_API_KEY=a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz
```

**Full `.env` example:**
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pos-system

# JWT Secret
JWT_SECRET=your-jwt-secret-key

# Webhook Configuration
WEBHOOK_API_KEY=a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz

# Server
PORT=8080
NODE_ENV=development
```

### Step 3: Restart POS API

```bash
# If using npm
npm run dev

# If using pm2
pm2 restart rispit-pos-api

# Or simply restart your server
```

### Step 4: Test Webhook Endpoint

Test that the webhook endpoint is accessible:

```bash
curl -X GET https://your-pos-api.com/api/webhooks/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "ok",
  "service": "POS API - WooCommerce Webhook Receiver",
  "timestamp": "2024-01-19T10:00:00.000Z",
  "version": "1.0.0"
}
```

✅ If you see this response, your webhook endpoint is ready!

### Step 5: Configure WordPress Plugin

1. **Log in to WordPress Admin**

2. **Navigate to POS Sync Settings**
   - Go to **WordPress Admin > POS Sync**

3. **Configure Order Webhook Settings**
   - Scroll to "Order Webhook Settings" section
   - Enable Order Webhooks: **✅ Check this box**
   - Webhook URL: `https://your-pos-api.com/api/webhooks/orders`
   - API Key: `a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz`
     (Use the same key from Step 1)
   - Max Retries: `3` (default is fine)

4. **Save Settings**
   - Click "Save Changes"

### Step 6: Test the Integration

#### Option A: Create a Test Order in WooCommerce

1. Go to your WooCommerce store
2. Add a product to cart
3. Complete checkout
4. Check POS API logs to see the webhook received

#### Option B: Manual Webhook Test

```bash
curl -X POST https://your-pos-api.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_WEBHOOK_API_KEY" \
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
        "phone": "123-456-7890",
        "address_1": "123 Test St",
        "city": "Test City",
        "postcode": "12345",
        "country": "US"
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

**Expected response:**
```json
{
  "success": true,
  "message": "Order webhook received successfully",
  "event": "order.created",
  "order_id": 999,
  "order_number": "TEST-999",
  "wc_order_db_id": "507f1f77bcf86cd799439011"
}
```

## Verification Checklist

✅ **API Key Generated**: Secure 32+ character key created
✅ **Environment Variable Set**: `WEBHOOK_API_KEY` added to `.env`
✅ **Server Restarted**: POS API server is running with new config
✅ **Health Check Passes**: `/api/webhooks/health` returns success
✅ **WordPress Plugin Configured**: Webhook URL and API key set
✅ **Test Order Processed**: Webhook received and processed successfully

## Common URLs

Replace `your-domain.com` with your actual domain:

| Endpoint | URL |
|----------|-----|
| Webhook Receiver | `https://your-pos-api.com/api/webhooks/orders` |
| Health Check | `https://your-pos-api.com/api/webhooks/health` |
| Order Stats | `https://your-pos-api.com/api/webhooks/orders/stats` |
| API Documentation | `https://your-pos-api.com/api-docs` |

## Troubleshooting

### Issue: Webhooks not being received

**Solution:**
1. Check that the webhook URL is correct in WordPress settings
2. Verify API key matches in both WordPress and `.env`
3. Check firewall settings - ensure port is open
4. Test health endpoint to verify server is running
5. Check WordPress debug logs: `wp-content/debug.log`

### Issue: 401 Unauthorized Error

**Solution:**
1. Verify API key is correct in WordPress plugin settings
2. Check `.env` file has correct `WEBHOOK_API_KEY`
3. Ensure no extra spaces in API key
4. Restart POS API server after changing `.env`

### Issue: Inventory not updating

**Solution:**
1. Check that product SKUs in WooCommerce match POS SKUs exactly
2. Verify products exist in POS database
3. Check processing status: `GET /api/webhooks/orders/:id`
4. Look for `processing_error` field in order data

### Issue: Server not responding

**Solution:**
1. Check server logs for errors
2. Verify MongoDB connection is working
3. Ensure PORT is not blocked by firewall
4. Test basic endpoints like `/` or `/api-docs`

## Viewing Webhook Data

### Via API (requires authentication)

```bash
# Get all orders
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-pos-api.com/api/webhooks/orders"

# Get order statistics
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-pos-api.com/api/webhooks/orders/stats"

# Get specific order
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-pos-api.com/api/webhooks/orders/ORDER_ID"
```

### Via MongoDB

```bash
# Connect to MongoDB
mongo

# Use your database
use pos-system

# View orders
db.woocommerceorders.find().pretty()

# Count orders
db.woocommerceorders.count()

# View recent orders
db.woocommerceorders.find().sort({createdAt: -1}).limit(10).pretty()
```

## Next Steps

After successful setup:

1. **Monitor Initial Orders**: Watch the first few orders to ensure everything works
2. **Check Inventory Sync**: Verify inventory levels update correctly
3. **Review Customer Data**: Check that customers are being synced
4. **Set Up Monitoring**: Consider setting up alerts for webhook failures
5. **Read Full Documentation**: See `WEBHOOK_INTEGRATION.md` for advanced features

## Production Checklist

Before going live in production:

- [ ] Use HTTPS (SSL certificate installed)
- [ ] Strong API key configured (32+ characters)
- [ ] Environment variables secured (not in version control)
- [ ] Server firewall configured properly
- [ ] MongoDB backup configured
- [ ] Logging enabled for debugging
- [ ] Error monitoring set up
- [ ] Test all webhook scenarios
- [ ] Document API key location for team
- [ ] Set up API key rotation schedule

## Security Best Practices

1. **Never commit API keys to Git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment-specific keys**
   - Development: One key
   - Staging: Different key
   - Production: Different key

3. **Rotate keys periodically**
   - Every 90 days recommended
   - Update both WordPress and `.env`

4. **Monitor webhook activity**
   - Check logs regularly
   - Set up alerts for failures
   - Review order statistics

5. **Use HTTPS only in production**
   - Never send API keys over HTTP
   - Use SSL/TLS certificates

## Support

If you need help:

1. Check `WEBHOOK_INTEGRATION.md` for detailed documentation
2. Review API documentation at `/api-docs`
3. Check WordPress debug logs
4. Check POS API server logs
5. Test webhook manually using curl
6. Contact technical support

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│         WEBHOOK QUICK REFERENCE                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Webhook URL:                                    │
│ https://your-pos-api.com/api/webhooks/orders   │
│                                                 │
│ Health Check:                                   │
│ GET /api/webhooks/health                        │
│                                                 │
│ Authentication:                                 │
│ X-API-Key: your-webhook-api-key                 │
│                                                 │
│ Events:                                         │
│ - order.created                                 │
│ - order.status_changed                          │
│                                                 │
│ Test Command:                                   │
│ curl https://your-pos-api.com/api/webhooks/health│
│                                                 │
└─────────────────────────────────────────────────┘
```

---

**Setup Complete!** 🎉

Your WooCommerce store is now connected to your POS system. Orders will automatically sync in real-time!
