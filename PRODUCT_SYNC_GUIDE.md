# Product Sync to WooCommerce Guide

This guide explains how to sync products from your POS API to WooCommerce using the WordPress plugin.

## Overview

The product sync feature allows you to automatically or manually sync products from your POS system to WooCommerce. When you create, update, or delete a product in your POS, it can automatically sync to WooCommerce.

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

Add these to your `.env` file:

```bash
# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_API_KEY=your-wordpress-api-key-from-plugin-settings

# Enable/Disable Auto-Sync (optional, default: false)
SYNC_TO_WOOCOMMERCE=true
```

### 2. Get WordPress API Key

1. Go to **WordPress Admin → POS Sync**
2. Copy the API key displayed on the settings page
3. Add it to your `.env` file as `WORDPRESS_API_KEY`

### 3. Enable Auto-Sync (Optional)

Set `SYNC_TO_WOOCOMMERCE=true` in your `.env` to enable automatic syncing when products are created/updated.

## Features

### ✅ Automatic Sync (When Enabled)

- **Product Created:** Automatically syncs to WooCommerce
- **Product Updated:** Automatically syncs changes to WooCommerce
- **Product Deleted:** Automatically deletes from WooCommerce

### ✅ Manual Sync

Use API endpoints to manually sync products:
- Sync single product
- Sync all products
- Check sync status
- Delete product from WooCommerce

## API Endpoints

### Check Sync Status

**GET** `/api/woocommerce/status`

Check if WooCommerce sync is configured and connected.

**Response:**
```json
{
  "success": true,
  "syncEnabled": true,
  "enabled": true,
  "connected": true,
  "status": {
    "success": true,
    "status": "active",
    "woocommerce_active": true,
    "version": "1.0.0"
  }
}
```

### Sync Single Product

**POST** `/api/woocommerce/sync-product/:id`

Manually sync a specific product to WooCommerce.

**Example:**
```bash
curl -X POST http://localhost:8080/api/woocommerce/sync-product/507f1f77bcf86cd799439011 \
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

**POST** `/api/woocommerce/sync-all?limit=100&skip=0`

Sync all active products to WooCommerce.

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
  "results": {
    "success": [
      { "product_id": 123, "sku": "PROD-001" },
      { "product_id": 124, "sku": "PROD-002" }
    ],
    "failed": []
  }
}
```

### Delete Product from WooCommerce

**DELETE** `/api/woocommerce/delete-product/:id`

Manually delete a product from WooCommerce.

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/woocommerce/delete-product/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Product Data Mapping

### POS Product → WooCommerce Product

| POS Field | WooCommerce Field | Notes |
|-----------|-------------------|-------|
| `sku` | `sku` | Required, unique identifier |
| `name` | `name` | Required |
| `sellingPrice` | `price` | Regular price |
| `discountedPrice` | `sale_price` | Sale price (if available) |
| `description` | `description` | Full description |
| `name` (truncated) | `short_description` | First 160 characters |
| `stock` | `stock_quantity` | Stock quantity |
| `stock > 0` | `stock_status` | 'instock' or 'outofstock' |
| `category` | `categories` | Array with category name |
| `image` | `images` | Array with image URL |
| `weight` | `weight` | Product weight |
| `length`, `width`, `height` | `length`, `width`, `height` | Dimensions |
| `taxRate` | `meta_data.pos_tax_rate` | Custom meta field |
| `unit` | `meta_data.pos_unit` | Custom meta field |

### Meta Data

Additional information stored in WooCommerce meta:
- `pos_product_id` - Original POS product ID
- `pos_last_synced` - Last sync timestamp
- `pos_tax_rate` - Tax rate from POS
- `pos_unit` - Unit of measurement
- `pos_has_variations` - Whether product has variations
- `pos_variation_count` - Number of variation combinations

## Automatic Sync Behavior

### When Auto-Sync is Enabled (`SYNC_TO_WOOCOMMERCE=true`)

1. **Product Created:**
   - Product is saved to POS database
   - Automatically synced to WooCommerce (non-blocking)
   - If sync fails, product is still created in POS

2. **Product Updated:**
   - Product is updated in POS database
   - Automatically synced to WooCommerce (non-blocking)
   - If sync fails, product is still updated in POS

3. **Product Deleted:**
   - Product is deleted from WooCommerce first
   - Then deleted from POS database
   - If WooCommerce deletion fails, POS deletion still proceeds

### Error Handling

- Sync errors are logged but don't break product operations
- Failed syncs can be retried manually using API endpoints
- Check server logs for sync error details

## Manual Sync Workflow

### Initial Setup

1. **Check Status:**
   ```bash
   GET /api/woocommerce/status
   ```

2. **Sync All Products:**
   ```bash
   POST /api/woocommerce/sync-all?limit=1000
   ```

3. **Verify in WooCommerce:**
   - Check WordPress admin → Products
   - Verify products are created/updated

### Ongoing Maintenance

- **New Products:** Automatically sync if `SYNC_TO_WOOCOMMERCE=true`
- **Updated Products:** Automatically sync if enabled
- **Failed Syncs:** Use manual sync endpoint to retry

## Troubleshooting

### Sync Not Working

1. **Check Configuration:**
   ```bash
   GET /api/woocommerce/status
   ```
   Verify `syncEnabled`, `enabled`, and `connected` are all `true`

2. **Check Environment Variables:**
   - `WORDPRESS_URL` is correct
   - `WORDPRESS_API_KEY` matches WordPress plugin settings
   - `SYNC_TO_WOOCOMMERCE=true` if you want auto-sync

3. **Check WordPress Plugin:**
   - Plugin is activated
   - API key matches in both systems
   - WordPress site is accessible

### Products Not Appearing in WooCommerce

1. **Check Sync Status:**
   - Use status endpoint to verify connection
   - Check server logs for errors

2. **Manual Sync:**
   - Try syncing a single product manually
   - Check response for error messages

3. **Verify Product Data:**
   - Ensure product has `sku` and `name`
   - Check that product is active (`isActive: true`)

### Sync Errors

1. **Check Server Logs:**
   - Look for error messages starting with `❌ Error syncing product`
   - Check for network errors or API key issues

2. **Test Connection:**
   - Use status endpoint to test WordPress connection
   - Verify API key is correct

3. **Retry Sync:**
   - Use manual sync endpoints to retry failed products
   - Check WooCommerce for partial updates

## Best Practices

1. **Initial Sync:**
   - Disable auto-sync initially
   - Manually sync all products first
   - Verify everything works
   - Then enable auto-sync

2. **Monitoring:**
   - Check sync status regularly
   - Monitor server logs for errors
   - Set up alerts for sync failures

3. **SKU Management:**
   - Use consistent SKU format
   - Ensure SKUs are unique
   - Don't change SKUs after initial sync

4. **Error Handling:**
   - Sync failures don't break POS operations
   - Failed syncs can be retried manually
   - Keep backups of product data

## Security

- API key authentication required
- Admin role required for manual sync endpoints
- Environment variables stored securely
- HTTPS recommended in production

## Limitations

- **Variations:** Products with variations sync as main product only
- **Images:** Requires publicly accessible image URLs
- **Categories:** Must exist in WooCommerce or will be auto-created
- **Stock:** Only main product stock is synced (not variation combinations)

## Support

For issues or questions:
1. Check this guide
2. Review server logs
3. Test with status endpoint
4. Check WordPress plugin logs
5. Contact support team

## Example Workflow

```bash
# 1. Check if sync is configured
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8080/api/woocommerce/status

# 2. Sync all products
curl -X POST -H "Authorization: Bearer TOKEN" \
  "http://localhost:8080/api/woocommerce/sync-all?limit=100"

# 3. Sync a specific product
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:8080/api/woocommerce/sync-product/PRODUCT_ID

# 4. Verify in WooCommerce admin
# Check Products → All Products
```

---

**Product sync is now integrated!** 🎉

Products will automatically sync to WooCommerce when created or updated (if enabled).
