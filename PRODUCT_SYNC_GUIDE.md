# Product Sync Guide - POS API to WooCommerce

This guide explains how to sync products from your POS API to WooCommerce using the WordPress plugin.

## Overview

The product sync feature allows you to automatically or manually sync products from your POS system to WooCommerce. When products are created, updated, or deleted in your POS API, they can be automatically synced to your WooCommerce store.

## How It Works

```
POS API Product Created/Updated
         ↓
Transform to WooCommerce Format
         ↓
Call WordPress Plugin API
         ↓
WordPress Plugin Creates/Updates Product in WooCommerce
```

## Setup

### 1. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_API_KEY=your-wordpress-api-key-from-plugin-settings

# Enable/Disable Auto Sync
SYNC_TO_WOOCOMMERCE=true
```

**Getting Your WordPress API Key:**
1. Install the WooCommerce POS Sync plugin in WordPress
2. Go to **WordPress Admin → POS Sync**
3. Copy the API key displayed on the settings page
4. Paste it into your `.env` file

### 2. Enable Auto Sync

Set `SYNC_TO_WOOCOMMERCE=true` in your `.env` file to enable automatic syncing when products are:
- Created
- Updated
- Deleted

### 3. Restart Server

After updating `.env`, restart your server:

```bash
npm run dev
```

## Automatic Sync

When `SYNC_TO_WOOCOMMERCE=true`, products are automatically synced:

### Product Created
- When a new product is created via `POST /api/products`
- Product is automatically synced to WooCommerce
- Sync happens asynchronously (doesn't block the API response)

### Product Updated
- When a product is updated via `PUT /api/products/:id`
- Changes are automatically synced to WooCommerce
- Sync happens asynchronously

### Product Deleted
- When a product is deleted via `DELETE /api/products/:id`
- Product is automatically deleted from WooCommerce
- Sync happens before deletion (to ensure cleanup)

## Manual Sync

You can also manually sync products using these endpoints:

### Sync Single Product

**Endpoint:** `POST /api/woocommerce/sync-product/:id`

**Authentication:** Required (Admin only)

**Example:**
```bash
curl -X POST http://localhost:8080/api/woocommerce/sync-product/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Product synced to WooCommerce successfully",
  "product": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Sample Product",
    "sku": "PROD-001"
  },
  "wooCommerce": {
    "success": true,
    "product_id": 123,
    "message": "Product synced successfully."
  }
}
```

### Sync All Products

**Endpoint:** `POST /api/woocommerce/sync-all`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `limit` (optional, default: 100) - Maximum number of products to sync
- `skip` (optional, default: 0) - Number of products to skip

**Example:**
```bash
curl -X POST "http://localhost:8080/api/woocommerce/sync-all?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Synced 50 products to WooCommerce",
  "synced": 50,
  "result": {
    "success": [
      { "product_id": 123, "sku": "PROD-001" },
      { "product_id": 124, "sku": "PROD-002" }
    ],
    "failed": []
  }
}
```

### Check Sync Status

**Endpoint:** `GET /api/woocommerce/status`

**Authentication:** Required

**Example:**
```bash
curl http://localhost:8080/api/woocommerce/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "syncEnabled": true,
  "wordPress": {
    "enabled": true,
    "status": "active",
    "woocommerce_active": true,
    "version": "1.0.0"
  }
}
```

## Product Data Mapping

### POS Product → WooCommerce Product

| POS Field | WooCommerce Field | Notes |
|-----------|-------------------|-------|
| `sku` | `sku` | Required, unique identifier |
| `name` | `name` | Product name |
| `sellingPrice` | `price` | Regular price |
| `description` | `description` | Full description |
| `name` | `short_description` | Short description (uses name) |
| `stock` | `stock_quantity` | Stock quantity |
| `stock > 0` | `stock_status` | "instock" or "outofstock" |
| `category` | `categories` | Array with category name |
| `image` | `images` | Array of image URLs |
| `_id` | `meta_data.pos_product_id` | POS product ID |
| `purchasePrice` | `meta_data.pos_purchase_price` | Purchase price |
| `minStock` | `meta_data.pos_min_stock` | Minimum stock level |
| `barcodeId` | `meta_data.pos_barcode_id` | Barcode ID |
| `unit` | `meta_data.pos_unit` | Unit of measurement |
| `taxRate` | `meta_data.pos_tax_rate` | Tax rate |

### Special Handling

- **Variations:** Products with variations are synced as simple products. Variation information is stored in meta data.
- **Images:** Main product image and variation combination images are included.
- **Stock Status:** Automatically calculated based on stock quantity.

## Error Handling

### Sync Failures

If sync fails:
- The error is logged to the console
- The API request still succeeds (sync is non-blocking)
- You can retry manually using the sync endpoints
- Check server logs for detailed error messages

### Common Errors

**Error: "WooCommerce sync is not enabled"**
- Solution: Set `SYNC_TO_WOOCOMMERCE=true` in `.env`

**Error: "WordPress URL or API key not configured"**
- Solution: Add `WORDPRESS_URL` and `WORDPRESS_API_KEY` to `.env`

**Error: "Invalid API key"**
- Solution: Verify API key matches the one in WordPress plugin settings

**Error: "Product not found"**
- Solution: Verify product ID is correct

**Error: "Network timeout"**
- Solution: Check WordPress site is accessible, increase timeout if needed

## Best Practices

### 1. Initial Sync

For initial setup, sync all products manually:

```bash
POST /api/woocommerce/sync-all
```

### 2. Regular Sync

- Enable auto-sync for ongoing synchronization
- Use manual sync for bulk operations or troubleshooting
- Monitor sync status regularly

### 3. Product Updates

- Update products in POS API first
- Changes automatically sync to WooCommerce
- Verify sync in WooCommerce admin

### 4. Error Monitoring

- Check server logs regularly
- Monitor sync status endpoint
- Set up alerts for sync failures

### 5. Performance

- Batch sync large numbers of products
- Use pagination (`limit` and `skip`) for large catalogs
- Sync during off-peak hours if possible

## Troubleshooting

### Products Not Syncing

1. **Check Configuration:**
   ```bash
   GET /api/woocommerce/status
   ```
   Verify `syncEnabled` is `true` and WordPress connection is working.

2. **Check Environment Variables:**
   - Verify `.env` file has correct values
   - Restart server after changing `.env`
   - Check for typos in URLs or API keys

3. **Check WordPress Plugin:**
   - Verify plugin is installed and activated
   - Check API key matches in both places
   - Test WordPress endpoint manually:
     ```bash
     curl -X GET https://your-wordpress-site.com/wp-json/wc-pos-sync/v1/status \
       -H "X-API-Key: YOUR_API_KEY"
     ```

4. **Check Server Logs:**
   - Look for sync error messages
   - Check network connectivity
   - Verify product data format

### Sync Status Shows Disabled

1. Check `.env` file:
   ```bash
   SYNC_TO_WOOCOMMERCE=true
   WORDPRESS_URL=https://your-site.com
   WORDPRESS_API_KEY=your-key
   ```

2. Restart server after changes

3. Verify environment variables are loaded:
   ```bash
   console.log(process.env.SYNC_TO_WOOCOMMERCE)
   ```

### Products Syncing But Not Appearing in WooCommerce

1. Check WordPress plugin logs
2. Verify WooCommerce is active
3. Check product SKU conflicts
4. Verify product data format matches requirements

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/woocommerce/status` | Required | Check sync status |
| POST | `/api/woocommerce/sync-product/:id` | Admin | Sync single product |
| POST | `/api/woocommerce/sync-all` | Admin | Sync all products |

## WordPress Plugin Endpoints

The WordPress plugin provides these endpoints (used internally):

| Endpoint | Description |
|----------|-------------|
| `POST /wp-json/wc-pos-sync/v1/sync-product` | Sync single product |
| `POST /wp-json/wc-pos-sync/v1/sync-products` | Sync multiple products |
| `POST /wp-json/wc-pos-sync/v1/delete-product` | Delete product |
| `GET /wp-json/wc-pos-sync/v1/status` | Check plugin status |

## Security

- All sync endpoints require authentication
- Admin-only endpoints for manual sync
- API key authentication for WordPress communication
- HTTPS recommended in production

## Limitations

- Products with complex variations sync as simple products
- Variation combinations are stored in meta data
- Images must be publicly accessible URLs
- Stock sync is one-way (POS → WooCommerce)

## Future Enhancements

Potential improvements:
- Bidirectional sync (WooCommerce → POS)
- Real-time sync via webhooks
- Variation product support
- Image upload handling
- Conflict resolution
- Sync history and logs

## Support

For issues or questions:
1. Check this guide
2. Review server logs
3. Test WordPress plugin endpoints
4. Verify environment configuration
5. Contact support team

---

**Product sync is now enabled!** 🎉

Your products will automatically sync to WooCommerce when created or updated in your POS system.
