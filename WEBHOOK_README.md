# 🔗 WooCommerce Webhook Integration

> **Quick Start:** Get your WooCommerce orders syncing to your POS API in 5 minutes!

## 📋 What's Included

This implementation provides a complete webhook integration system for receiving WooCommerce orders in your POS API.

## 🚀 Quick Start

### 1. Generate API Key

```bash
openssl rand -hex 32
```

### 2. Add to .env

```bash
WEBHOOK_API_KEY=your-generated-key-here
```

### 3. Restart Server

```bash
npm run dev
```

### 4. Test Connection

```bash
curl http://localhost:8080/api/webhooks/health
```

### 5. Configure WordPress

- Go to **WordPress Admin → POS Sync → Order Webhook Settings**
- Enable Order Webhooks: ✓
- Webhook URL: `https://your-api.com/api/webhooks/orders`
- API Key: (paste your generated key)
- Save Changes

## ✨ Features

- ✅ Receive WooCommerce order webhooks in real-time
- ✅ Automatic inventory updates based on orders
- ✅ Customer data synchronization
- ✅ Order status tracking with history
- ✅ Stock restoration on cancellations/refunds
- ✅ API key authentication for security
- ✅ Complete error handling and logging
- ✅ Statistics and analytics
- ✅ Full Swagger documentation

## 📁 Files Created

```
rispit-pos-demo-api/
├── models/
│   └── WooCommerceOrder.js          ← MongoDB schema
├── middleware/
│   └── webhookAuth.js               ← API key validation
├── controllers/
│   └── webhookController.js         ← Webhook logic
├── routes/
│   └── webhookRoutes.js             ← API endpoints
├── WEBHOOK_INTEGRATION.md           ← Full documentation
├── WEBHOOK_SETUP_GUIDE.md          ← Quick setup guide
├── WEBHOOK_IMPLEMENTATION_SUMMARY.md ← Technical summary
├── test-webhook.sh                  ← Test script
└── server.js (modified)             ← Added routes
```

## 🔌 API Endpoints

### Webhook Receiver (Public - API Key Required)
```
POST /api/webhooks/orders
```
Receives order webhooks from WooCommerce.

### Health Check (Public - No Auth)
```
GET /api/webhooks/health
```
Verify webhook service is running.

### Management Endpoints (Authenticated - JWT Required)
```
GET  /api/webhooks/orders          # List all orders
GET  /api/webhooks/orders/:id      # Get single order
GET  /api/webhooks/orders/stats    # Get statistics
```

## 📚 Documentation

| Document | Description | When to Use |
|----------|-------------|-------------|
| `WEBHOOK_SETUP_GUIDE.md` | 5-minute setup guide | **Start here!** |
| `WEBHOOK_INTEGRATION.md` | Complete technical docs | Deep dive, troubleshooting |
| `WEBHOOK_IMPLEMENTATION_SUMMARY.md` | Implementation details | Reference, architecture |
| `/api-docs` | Interactive API docs | Testing, API reference |

## 🧪 Testing

### Run Automated Tests
```bash
./test-webhook.sh
```

### Manual Test
```bash
curl -X POST http://localhost:8080/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "event": "order.created",
    "data": {
      "id": 123,
      "order_number": "123",
      "status": "processing",
      "total": 50.00,
      "billing": {"email": "test@example.com"},
      "line_items": [{"sku": "PROD-001", "quantity": 1}]
    }
  }'
```

## 🔄 How It Works

```
WooCommerce Order Created/Updated
           ↓
   WordPress Plugin Sends Webhook
           ↓
   POS API Receives Order Data
           ↓
      ┌────┴────┐
      ↓         ↓
Store Order   Update Inventory
      ↓         ↓
 Sync Customer   Track Status
```

## 🛡️ Security

- **API Key Authentication:** All webhooks require valid API key
- **Environment Variables:** Sensitive data in `.env` (not committed)
- **HTTPS:** Use SSL in production
- **Input Validation:** All data validated before processing
- **Error Masking:** Internal errors not exposed to clients

## 📊 What Gets Synced

### From WooCommerce to POS:

- ✅ **Orders:** Complete order data including line items, totals, taxes
- ✅ **Customers:** Contact info, addresses (auto-created if new)
- ✅ **Inventory:** Stock levels updated automatically
- ✅ **Status:** Order status changes tracked in history

### Automatic Actions:

- **Order Created:** Reduce product stock
- **Order Cancelled:** Restore product stock
- **Order Refunded:** Restore product stock
- **Status Changed:** Update and track in history

## 🔍 Monitoring

### View Order Statistics
```bash
# Get JWT token first from /api/auth/login
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/webhooks/orders/stats
```

### Check Recent Orders
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:8080/api/webhooks/orders?page=1&limit=10"
```

### MongoDB Queries
```javascript
// Connect to MongoDB
use pos-system

// View recent orders
db.woocommerceorders.find().sort({createdAt: -1}).limit(10)

// Count orders by status
db.woocommerceorders.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])

// Find unprocessed orders
db.woocommerceorders.find({processed: false})
```

## ⚠️ Troubleshooting

### Issue: Webhooks not arriving
**Solution:**
1. Check API key matches in WordPress and `.env`
2. Verify URL is accessible from internet
3. Check firewall allows incoming connections
4. Test health endpoint: `curl https://your-api.com/api/webhooks/health`

### Issue: Inventory not updating
**Solution:**
1. Verify product SKUs match between WooCommerce and POS
2. Check products exist in POS database
3. Look for processing errors in order data
4. Check server logs for detailed errors

### Issue: 401 Unauthorized
**Solution:**
1. Verify API key is correct in both places
2. Check for extra spaces or line breaks in API key
3. Restart server after changing `.env`
4. Test with curl to verify authentication

## 📖 Environment Variables

```bash
# Required for webhooks
WEBHOOK_API_KEY=your-32-character-key-here

# Required for database
MONGODB_URI=mongodb://localhost:27017/pos-system

# Required for authenticated endpoints
JWT_SECRET=your-jwt-secret

# Optional
PORT=8080
NODE_ENV=development
```

## 🎯 Next Steps

1. **✓ Complete Setup**
   - Follow `WEBHOOK_SETUP_GUIDE.md`
   - Test with sample order

2. **✓ Monitor First Orders**
   - Watch for incoming webhooks
   - Verify inventory updates
   - Check customer sync

3. **✓ Production Deployment**
   - Use HTTPS
   - Strong API keys
   - Monitor logs
   - Set up alerts

## 💡 Tips

- **Use Different API Keys** for development, staging, and production
- **Monitor Logs** regularly for errors or issues
- **Test Thoroughly** before going live
- **Backup Database** before making changes
- **Rotate API Keys** every 90 days for security

## 🆘 Need Help?

1. **Quick Setup:** Read `WEBHOOK_SETUP_GUIDE.md`
2. **Detailed Info:** Read `WEBHOOK_INTEGRATION.md`
3. **API Reference:** Visit `/api-docs` on your running server
4. **Test Issues:** Run `./test-webhook.sh` to diagnose
5. **Check Logs:** Review server console and MongoDB data

## 📞 Support Checklist

Before asking for help, check:

- [ ] API key is correct in both WordPress and `.env`
- [ ] Server is running and accessible
- [ ] Health endpoint returns success
- [ ] Environment variables are loaded
- [ ] MongoDB is connected
- [ ] Products exist with matching SKUs
- [ ] WordPress plugin is activated and configured

## 🎉 Success Indicators

You know it's working when:

✅ Health check returns `{"success": true}`
✅ Test order creates record in database
✅ Inventory decreases when order created
✅ Customer appears in customers collection
✅ Order stats show received webhooks

---

## 🚀 Ready to Start?

1. **Quick Setup:** `WEBHOOK_SETUP_GUIDE.md` (5 minutes)
2. **Test:** Create an order in WooCommerce
3. **Verify:** Check POS API received it
4. **Done!** 🎊

---

**Made with ❤️ for seamless WooCommerce + POS integration**
