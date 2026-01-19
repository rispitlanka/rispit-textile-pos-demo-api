# WooCommerce Sync Timeout Fix

## Problem
The WooCommerce product sync was failing with a 500 error:
```
{
  "success": false,
  "message": "Failed to sync products to WooCommerce",
  "error": "timeout of 60000ms exceeded"
}
```

This occurred when syncing multiple products because the WordPress/WooCommerce server was taking longer than 60 seconds to process the batch request.

## Solution

### 1. **Chunking Implementation**
Products are now synced in smaller batches (default: 20 products per chunk) instead of sending all products at once. This prevents timeout issues and improves reliability.

### 2. **Increased Timeout**
- Single product sync: 60 seconds (increased from 30 seconds)
- Batch sync per chunk: 120 seconds (2 minutes, increased from 60 seconds)

### 3. **Retry Logic with Exponential Backoff**
- Automatic retry on failure (default: 3 retries for batch, 2 for single)
- Exponential backoff: delays increase with each retry (2s, 4s, 8s...)
- Better error handling and logging

### 4. **Improved Error Reporting**
- Detailed success/failure tracking per product
- Progress logging during sync
- Better error messages distinguishing timeout vs other errors

## Configuration

### Environment Variables

Add these optional environment variables to customize sync behavior:

```env
# WooCommerce Sync Configuration
WORDPRESS_URL=https://your-site.com
WORDPRESS_API_KEY=your-api-key
SYNC_TO_WOOCOMMERCE=true

# Optional: Customize sync behavior
WOOCOMMERCE_SYNC_CHUNK_SIZE=20        # Products per chunk (default: 20)
WOOCOMMERCE_SYNC_TIMEOUT=120000       # Timeout per chunk in ms (default: 120000 = 2 minutes)
WOOCOMMERCE_SYNC_MAX_RETRIES=3        # Max retries per chunk (default: 3)
WOOCOMMERCE_SYNC_RETRY_DELAY=2000     # Initial retry delay in ms (default: 2000 = 2 seconds)
```

### API Query Parameters

When calling the sync-all endpoint, you can customize chunk size:

```bash
# Sync with custom chunk size (e.g., 10 products per chunk)
POST /api/woocommerce/sync-all?limit=100&chunkSize=10
```

## Usage Examples

### Sync All Products (with chunking)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/woocommerce/sync-all?limit=100&chunkSize=20"
```

**Response:**
```json
{
  "success": true,
  "message": "Synced 95 products, 5 failed",
  "synced": 95,
  "failed": 5,
  "total": 100,
  "results": {
    "success": [
      {
        "product": "Product Name 1",
        "sku": "SKU001",
        "wooCommerce": { ... }
      }
    ],
    "failed": [
      {
        "product": "Product Name 2",
        "sku": "SKU002",
        "error": "Request timeout - WooCommerce server took too long to respond"
      }
    ],
    "total": 100
  }
}
```

### Sync Single Product (with retry)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/woocommerce/sync-product/PRODUCT_ID"
```

## How It Works

### Batch Sync Flow

```
1. Receive request to sync N products
   ↓
2. Split products into chunks (default: 20 per chunk)
   ↓
3. For each chunk:
   a. Transform products to WooCommerce format
   b. Send POST request to WordPress API
   c. If timeout/failure:
      - Wait with exponential backoff
      - Retry (up to maxRetries times)
   d. Track success/failure for each product
   ↓
4. Return aggregated results
```

### Retry Logic

- **Attempt 1**: Immediate request
- **Attempt 2**: Wait 2 seconds, retry
- **Attempt 3**: Wait 4 seconds, retry
- **Attempt 4**: Wait 8 seconds, retry (if maxRetries = 3, this won't happen)

## Benefits

1. **No More Timeouts**: Chunking prevents large batches from timing out
2. **Better Reliability**: Retry logic handles temporary network issues
3. **Progress Tracking**: See which products succeeded/failed
4. **Configurable**: Adjust chunk size and timeouts based on your server capacity
5. **Non-Blocking**: Failed chunks don't prevent other chunks from syncing

## Troubleshooting

### Still Getting Timeouts?

1. **Reduce chunk size**: Set `WOOCOMMERCE_SYNC_CHUNK_SIZE=10` or use `?chunkSize=10` in API call
2. **Increase timeout**: Set `WOOCOMMERCE_SYNC_TIMEOUT=180000` (3 minutes)
3. **Check WordPress server**: Ensure it can handle the load
4. **Check network**: Verify connection to WordPress server

### Products Not Syncing?

1. Check sync status: `GET /api/woocommerce/status`
2. Verify environment variables are set correctly
3. Check server logs for detailed error messages
4. Try syncing a single product first to isolate the issue

### Partial Success?

The API now returns HTTP 207 (Multi-Status) when some products succeed and some fail. Check the `results` object to see which products failed and why.

## Migration Notes

- **Backward Compatible**: Existing API calls work without changes
- **Default Behavior**: Uses sensible defaults (20 products/chunk, 2 min timeout)
- **Response Format**: Enhanced with detailed success/failure tracking

## Performance Considerations

- **Chunk Size**: Smaller chunks = more reliable but slower. Larger chunks = faster but higher timeout risk
- **Timeout**: Should be at least 2-3x the average processing time per chunk
- **Retries**: More retries = better reliability but slower overall sync time

## Example: Syncing 1000 Products

With default settings (20 products/chunk):
- 50 chunks total
- Each chunk: ~2-5 seconds (depending on server)
- Total time: ~2-4 minutes
- Automatic retries handle any temporary failures
