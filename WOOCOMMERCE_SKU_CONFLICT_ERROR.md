# WooCommerce SKU Conflict Error

## Problem

When syncing products to WooCommerce, you're getting a 500 error with the message:

```
The product with SKU (082831) you are trying to insert is already present in the lookup table
```

This error occurs because the WordPress plugin is trying to **create** products that already exist in WooCommerce, instead of **updating** them.

## Root Cause

The WordPress POS Sync plugin has a bug where it:
1. Doesn't check if a product with the same SKU already exists
2. Always tries to create new products instead of updating existing ones
3. Crashes with a 500 error when it encounters a duplicate SKU

## Error Details

- **Error Type**: WordPress Server Error (500)
- **Error Code**: `internal_server_error`
- **Location**: WooCommerce data store (`class-wc-product-data-store-cpt.php:240`)
- **Impact**: When this happens in a batch sync, all products in the batch fail

## Solutions

### Solution 1: Delete Existing Products in WooCommerce (Quick Fix)

1. Go to WooCommerce → Products
2. Find products with the conflicting SKUs
3. Delete them
4. Re-run the sync

**Note**: This will remove the products from WooCommerce, so only do this if you want to replace them.

### Solution 2: Update WordPress Plugin (Recommended)

The WordPress plugin needs to be updated to:
1. Check if a product with the same SKU exists
2. Update existing products instead of creating new ones
3. Handle SKU conflicts gracefully

**Plugin File to Fix**: 
```
wp-content/plugins/wp-plugin/includes/class-wc-pos-sync-product-handler.php
```

The plugin should use `wc_get_product_id_by_sku()` to check if a product exists, then update it instead of creating a new one.

### Solution 3: Sync Products One at a Time (Workaround)

If batch sync fails, try syncing products individually:

```bash
# Sync single product
POST /api/woocommerce/sync-product/:id
```

This might work better if the plugin handles single products differently than batches.

### Solution 4: Use Different SKUs (Not Recommended)

If you need to keep both products, use different SKUs. However, this defeats the purpose of syncing.

## Improved Error Handling

The sync code now:
- ✅ Parses WordPress 500 errors to extract the actual error message
- ✅ Detects SKU conflicts specifically
- ✅ Provides clear error messages with actionable hints
- ✅ Doesn't retry server errors (500) - they won't succeed
- ✅ Shows which SKU is conflicting

## Error Response Format

When a SKU conflict occurs, you'll now see:

```json
{
  "success": false,
  "message": "Failed to sync products to WooCommerce",
  "results": {
    "failed": [
      {
        "product": "Product Name",
        "sku": "082831",
        "error": {
          "code": "sku_conflict",
          "message": "Product with SKU \"082831\" already exists in WooCommerce. The plugin should update existing products.",
          "data": {
            "status": 500,
            "wordpressError": {
              "message": "The product with SKU (082831) you are trying to insert is already present...",
              "file": "...",
              "line": 240
            },
            "hint": "Product may need to be deleted from WooCommerce first, or the WordPress plugin needs to handle updates instead of creates."
          }
        }
      }
    ]
  }
}
```

## Debugging

1. **Check which SKUs are conflicting**: Look at the error messages - they'll show the SKU
2. **Check WooCommerce**: Go to Products and search for the SKU
3. **Check plugin logs**: WordPress error logs will have more details
4. **Try single product sync**: Test with one product to see if it works differently

## Prevention

To prevent this issue:
1. **Update the WordPress plugin** to handle updates properly
2. **Delete existing products** before syncing if you want fresh data
3. **Use unique SKUs** if you need to keep both systems separate

## Next Steps

1. **Immediate**: Delete conflicting products from WooCommerce and re-sync
2. **Short-term**: Update the WordPress plugin to handle updates
3. **Long-term**: Implement proper product matching logic in the plugin

## Related Files

- `utils/woocommerce-sync.js` - Sync logic with improved error handling
- WordPress Plugin: `class-wc-pos-sync-product-handler.php` - Needs update to handle existing products
