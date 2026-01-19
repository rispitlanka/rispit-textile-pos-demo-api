import axios from 'axios';

const WORDPRESS_URL = process.env.WORDPRESS_URL || '';
const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY || '';
const SYNC_TO_WOOCOMMERCE = process.env.SYNC_TO_WOOCOMMERCE === 'true';

// Configuration for sync operations
const SYNC_CONFIG = {
  chunkSize: parseInt(process.env.WOOCOMMERCE_SYNC_CHUNK_SIZE) || 20,
  timeout: parseInt(process.env.WOOCOMMERCE_SYNC_TIMEOUT) || 120000, // 2 minutes
  maxRetries: parseInt(process.env.WOOCOMMERCE_SYNC_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.WOOCOMMERCE_SYNC_RETRY_DELAY) || 2000 // 2 seconds
};

/**
 * Check if WooCommerce sync is enabled and configured
 */
export function isWooCommerceSyncEnabled() {
  return SYNC_TO_WOOCOMMERCE && WORDPRESS_URL && WORDPRESS_API_KEY;
}

/**
 * Transform POS product to WooCommerce format
 */
function transformProductToWooCommerce(posProduct) {
  // Handle products with variations - sync main product only
  // WooCommerce will handle variations separately if needed
  const wcProduct = {
    sku: posProduct.sku || posProduct._id?.toString() || `POS-${Date.now()}`,
    name: posProduct.name,
    price: posProduct.sellingPrice || posProduct.price || 0,
    sale_price: posProduct.discountedPrice || null,
    description: posProduct.description || '',
    short_description: posProduct.name.substring(0, 160) || posProduct.name,
    stock_quantity: posProduct.stock || 0,
    manage_stock: true,
    stock_status: (posProduct.stock > 0) ? 'instock' : 'outofstock',
  };

  // Add weight if available
  if (posProduct.weight) {
    wcProduct.weight = posProduct.weight;
  }

  // Add dimensions if available
  if (posProduct.length) wcProduct.length = posProduct.length;
  if (posProduct.width) wcProduct.width = posProduct.width;
  if (posProduct.height) wcProduct.height = posProduct.height;

  // Add category
  if (posProduct.category) {
    wcProduct.categories = [posProduct.category];
  }

  // Add image if available
  if (posProduct.image) {
    wcProduct.images = [posProduct.image];
  }

  // Add meta data for tracking
  wcProduct.meta_data = [
    { key: 'pos_product_id', value: posProduct._id?.toString() || '' },
    { key: 'pos_last_synced', value: new Date().toISOString() }
  ];

  // Add tax rate if available
  if (posProduct.taxRate) {
    wcProduct.meta_data.push({
      key: 'pos_tax_rate',
      value: posProduct.taxRate.toString()
    });
  }

  // Add unit if available
  if (posProduct.unit) {
    wcProduct.meta_data.push({
      key: 'pos_unit',
      value: posProduct.unit
    });
  }

  // Note: For products with variations, we sync the main product
  // Variation combinations can be synced as separate products if needed
  if (posProduct.hasVariations && posProduct.variationCombinations?.length > 0) {
    wcProduct.meta_data.push({
      key: 'pos_has_variations',
      value: 'true'
    });
    wcProduct.meta_data.push({
      key: 'pos_variation_count',
      value: posProduct.variationCombinations.length.toString()
    });
  }

  return wcProduct;
}

/**
 * Sync single product to WooCommerce with retry logic
 */
export async function syncProductToWooCommerce(posProduct, options = {}) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('WooCommerce sync is disabled or not configured. Skipping product sync.');
    return null;
  }

  const {
    timeout = SYNC_CONFIG.timeout,
    maxRetries = Math.min(SYNC_CONFIG.maxRetries, 2), // Max 2 retries for single product
    retryDelay = Math.floor(SYNC_CONFIG.retryDelay / 2) // Half delay for single product
  } = options;

  const wcProduct = transformProductToWooCommerce(posProduct);
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const response = await axios.post(
        `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/sync-product`,
        wcProduct,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WORDPRESS_API_KEY
          },
          timeout: timeout
        }
      );
      
      console.log(`✅ Product synced to WooCommerce: ${posProduct.name} (SKU: ${wcProduct.sku})`);
      return response.data;
    } catch (error) {
      retryCount++;
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const errorMessage = error.response?.data || error.message;

      if (retryCount > maxRetries) {
        // Max retries reached
        console.error(`❌ Error syncing product to WooCommerce (${posProduct.name}) after ${maxRetries} retries:`, 
          errorMessage);
        
        // Return error info for optional handling
        return {
          success: false,
          error: isTimeout ? 'Request timeout - WooCommerce server took too long to respond' : errorMessage,
          product: posProduct.name,
          sku: wcProduct.sku
        };
      } else {
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount - 1);
        console.warn(`⚠️  Retrying sync for ${posProduct.name} (attempt ${retryCount}/${maxRetries}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Sync multiple products to WooCommerce with chunking and retry logic
 */
export async function syncProductsToWooCommerce(posProducts, options = {}) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('WooCommerce sync is disabled or not configured. Skipping batch sync.');
    return null;
  }

  const {
    chunkSize = SYNC_CONFIG.chunkSize,
    timeout = SYNC_CONFIG.timeout,
    maxRetries = SYNC_CONFIG.maxRetries,
    retryDelay = SYNC_CONFIG.retryDelay
  } = options;

  const results = {
    success: [],
    failed: [],
    total: posProducts.length
  };

  // Split products into chunks
  const chunks = [];
  for (let i = 0; i < posProducts.length; i += chunkSize) {
    chunks.push(posProducts.slice(i, i + chunkSize));
  }

  console.log(`📦 Syncing ${posProducts.length} products in ${chunks.length} chunks of ${chunkSize}...`);

  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const wcProducts = chunk.map(transformProductToWooCommerce);
    
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const response = await axios.post(
          `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/sync-products`,
          wcProducts,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': WORDPRESS_API_KEY
            },
            timeout: timeout
          }
        );
        
        // Track successful products
        const responseData = response.data;
        if (responseData && Array.isArray(responseData)) {
          responseData.forEach((item, index) => {
            if (item && item.success !== false) {
              results.success.push({
                product: chunk[index].name,
                sku: chunk[index].sku || chunk[index]._id?.toString(),
                wooCommerce: item
              });
            } else {
              results.failed.push({
                product: chunk[index].name,
                sku: chunk[index].sku || chunk[index]._id?.toString(),
                error: item?.error || 'Unknown error'
              });
            }
          });
        } else {
          // If response doesn't have array, assume all succeeded
          chunk.forEach(product => {
            results.success.push({
              product: product.name,
              sku: product.sku || product._id?.toString()
            });
          });
        }

        console.log(`✅ Synced chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} products)`);
        success = true;
      } catch (error) {
        retryCount++;
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const errorMessage = error.response?.data || error.message;

        if (retryCount > maxRetries) {
          // Max retries reached, mark all products in chunk as failed
          console.error(`❌ Failed to sync chunk ${chunkIndex + 1}/${chunks.length} after ${maxRetries} retries`);
          chunk.forEach(product => {
            results.failed.push({
              product: product.name,
              sku: product.sku || product._id?.toString(),
              error: isTimeout ? 'Request timeout - WooCommerce server took too long to respond' : errorMessage
            });
          });
        } else {
          // Retry with exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          console.warn(`⚠️  Chunk ${chunkIndex + 1}/${chunks.length} failed (attempt ${retryCount}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  console.log(`📊 Sync complete: ${results.success.length} succeeded, ${results.failed.length} failed out of ${results.total} total`);

  // Return results
  if (results.failed.length === 0) {
    return {
      success: true,
      message: `Successfully synced ${results.success.length} products`,
      results: results
    };
  } else if (results.success.length === 0) {
    return {
      success: false,
      message: `Failed to sync all ${results.failed.length} products`,
      error: 'All products failed to sync',
      results: results
    };
  } else {
    return {
      success: true,
      message: `Synced ${results.success.length} products, ${results.failed.length} failed`,
      results: results
    };
  }
}

/**
 * Delete product from WooCommerce
 */
export async function deleteProductFromWooCommerce(sku) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('WooCommerce sync is disabled or not configured. Skipping product deletion.');
    return null;
  }

  if (!sku) {
    console.warn('No SKU provided for WooCommerce product deletion');
    return null;
  }

  try {
    const response = await axios.post(
      `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/delete-product`,
      { sku },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WORDPRESS_API_KEY
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ Product deleted from WooCommerce: ${sku}`);
    return response.data;
  } catch (error) {
    // Log error but don't throw
    console.error(`❌ Error deleting product from WooCommerce (SKU: ${sku}):`, 
      error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Check WordPress plugin status
 */
export async function checkWordPressPluginStatus() {
  if (!WORDPRESS_URL || !WORDPRESS_API_KEY) {
    return {
      enabled: false,
      message: 'WordPress URL or API key not configured'
    };
  }

  try {
    const response = await axios.get(
      `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/status`,
      {
        headers: {
          'X-API-Key': WORDPRESS_API_KEY
        },
        timeout: 10000
      }
    );
    
    return {
      enabled: true,
      connected: true,
      status: response.data
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      error: error.response?.data || error.message
    };
  }
}
