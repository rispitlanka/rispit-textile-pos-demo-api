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
 * Checks process.env directly to ensure we get current values
 */
export function isWooCommerceSyncEnabled() {
  // Check process.env directly instead of module constants
  const syncEnabled = process.env.SYNC_TO_WOOCOMMERCE === 'true';
  const wordpressUrl = process.env.WORDPRESS_URL || '';
  const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
  
  const enabled = syncEnabled && wordpressUrl && wordpressApiKey;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[WooCommerce Sync] Configuration check:', {
      SYNC_TO_WOOCOMMERCE: syncEnabled,
      WORDPRESS_URL: wordpressUrl ? `${wordpressUrl.substring(0, 30)}...` : 'NOT SET',
      WORDPRESS_API_KEY: wordpressApiKey ? `SET (${wordpressApiKey.length} chars)` : 'NOT SET',
      enabled
    });
  }
  
  return enabled;
}

/**
 * Validate WooCommerce sync configuration
 * Checks process.env directly to ensure we get current values
 */
export function validateWooCommerceConfig() {
  const issues = [];
  
  // Check process.env directly instead of module constants
  const syncEnabled = process.env.SYNC_TO_WOOCOMMERCE === 'true';
  const wordpressUrl = process.env.WORDPRESS_URL || '';
  const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
  
  if (!syncEnabled) {
    issues.push('SYNC_TO_WOOCOMMERCE is not set to "true"');
  }
  
  if (!wordpressUrl) {
    issues.push('WORDPRESS_URL is not configured');
  } else if (!wordpressUrl.startsWith('http://') && !wordpressUrl.startsWith('https://')) {
    issues.push('WORDPRESS_URL must start with http:// or https://');
  }
  
  if (!wordpressApiKey) {
    issues.push('WORDPRESS_API_KEY is not configured');
  } else if (wordpressApiKey.length < 10) {
    issues.push('WORDPRESS_API_KEY appears to be too short (should be at least 10 characters)');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
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
    console.log('[WooCommerce Sync] Sync disabled or not configured. Skipping product sync.');
    return null;
  }

  const {
    timeout = SYNC_CONFIG.timeout,
    maxRetries = Math.min(SYNC_CONFIG.maxRetries, 2), // Max 2 retries for single product
    retryDelay = Math.floor(SYNC_CONFIG.retryDelay / 2) // Half delay for single product
  } = options;

    const wcProduct = transformProductToWooCommerce(posProduct);
  let retryCount = 0;
  
  // Get current values from process.env
  const wordpressUrl = process.env.WORDPRESS_URL || '';
  const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
  const syncUrl = `${wordpressUrl}/wp-json/wc-pos-sync/v1/sync-product`;
  
  console.log('[WooCommerce Sync] Starting single product sync:', {
    productName: posProduct.name,
    productId: posProduct._id?.toString(),
    sku: wcProduct.sku,
    url: syncUrl,
    timeout: `${timeout}ms`,
    maxRetries
  });

  while (retryCount <= maxRetries) {
    const attempt = retryCount + 1;
    try {
      console.log(`[WooCommerce Sync] Attempt ${attempt}/${maxRetries + 1} - Sending request:`, {
        url: syncUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': wordpressApiKey ? `${wordpressApiKey.substring(0, 8)}...${wordpressApiKey.substring(wordpressApiKey.length - 4)}` : 'NOT SET'
        },
        payloadSize: JSON.stringify(wcProduct).length,
        timeout: `${timeout}ms`
      });
      
      const startTime = Date.now();
      const response = await axios.post(
        syncUrl,
        wcProduct,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': wordpressApiKey
          },
          timeout: timeout
        }
      );
      const duration = Date.now() - startTime;
      
      console.log(`[WooCommerce Sync] ✅ Success (${duration}ms):`, {
        productName: posProduct.name,
        sku: wcProduct.sku,
        status: response.status,
        statusText: response.statusText,
        responseData: response.data
      });
    
    console.log(`✅ Product synced to WooCommerce: ${posProduct.name} (SKU: ${wcProduct.sku})`);
    return response.data;
  } catch (error) {
      retryCount++;
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;
      const errorMessage = error.response?.data || error.message;
      const errorData = error.response?.data || {};

      console.error(`[WooCommerce Sync] ❌ Error on attempt ${retryCount}/${maxRetries + 1}:`, {
        productName: posProduct.name,
        sku: wcProduct.sku,
        errorType: isTimeout ? 'TIMEOUT' : isAuthError ? 'AUTH_ERROR' : 'OTHER',
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: error.response?.data,
        requestUrl: syncUrl,
        willRetry: retryCount <= maxRetries && !isAuthError
      });

      if (retryCount > maxRetries) {
        // Max retries reached
        if (isAuthError) {
          console.error(`[WooCommerce Sync] ❌ Authentication error after ${maxRetries} retries:`, {
            productName: posProduct.name,
            error: errorMessage,
            status: error.response?.status,
            hint: 'Check WORDPRESS_API_KEY in .env file matches WordPress plugin settings'
          });
          console.error(`❌ Authentication error syncing product to WooCommerce (${posProduct.name}):`, errorMessage);
          console.error(`   Check your WORDPRESS_API_KEY in .env file`);
        } else {
          console.error(`[WooCommerce Sync] ❌ Failed after ${maxRetries} retries:`, {
            productName: posProduct.name,
            error: errorMessage,
            isTimeout
          });
          console.error(`❌ Error syncing product to WooCommerce (${posProduct.name}) after ${maxRetries} retries:`, 
            errorMessage);
        }
    
    // Return error info for optional handling
    return {
      success: false,
          error: isAuthError 
            ? {
                code: errorData.code || 'authentication_error',
                message: `Authentication failed: ${errorMessage}. Please verify WORDPRESS_API_KEY in your .env file matches the API key in WordPress plugin settings.`,
                data: {
                  status: error.response?.status,
                  hint: 'Check WordPress Admin → POS Sync → Settings for the correct API key'
                }
              }
            : (isTimeout ? 'Request timeout - WooCommerce server took too long to respond' : errorData || errorMessage),
          product: posProduct.name,
          sku: wcProduct.sku
        };
      } else {
        // Don't retry authentication errors
        if (isAuthError) {
          console.error(`[WooCommerce Sync] ❌ Authentication error - not retrying:`, {
            productName: posProduct.name,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
          });
          console.error(`❌ Authentication error: ${error.response?.data?.message || error.message}`);
          console.error(`   Check your WORDPRESS_API_KEY in .env file`);
          return {
            success: false,
            error: {
              code: error.response?.data?.code || 'authentication_error',
              message: `Authentication failed: ${error.response?.data?.message || error.message}. Please verify WORDPRESS_API_KEY.`,
              data: {
                status: error.response?.status,
                hint: 'Check WordPress Admin → POS Sync → Settings for the correct API key'
              }
            },
            product: posProduct.name,
            sku: wcProduct.sku
          };
        }
        
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount - 1);
        console.warn(`[WooCommerce Sync] ⚠️  Retrying in ${delay}ms:`, {
          productName: posProduct.name,
          attempt: `${retryCount}/${maxRetries}`,
          delay: `${delay}ms`,
          nextAttempt: retryCount + 1
        });
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

  // Get current values from process.env for logging
  const wordpressUrl = process.env.WORDPRESS_URL || '';
  
  console.log(`[WooCommerce Sync] 📦 Starting batch sync:`, {
    totalProducts: posProducts.length,
    chunkSize,
    totalChunks: chunks.length,
    timeout: `${timeout}ms`,
    maxRetries,
    retryDelay: `${retryDelay}ms`,
    syncUrl: `${wordpressUrl}/wp-json/wc-pos-sync/v1/sync-products`
  });
  console.log(`📦 Syncing ${posProducts.length} products in ${chunks.length} chunks of ${chunkSize}...`);

  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const wcProducts = chunk.map(transformProductToWooCommerce);
    const chunkStartTime = Date.now();
    
    console.log(`[WooCommerce Sync] Processing chunk ${chunkIndex + 1}/${chunks.length}:`, {
      chunkIndex: chunkIndex + 1,
      productsInChunk: chunk.length,
      productNames: chunk.map(p => p.name),
      skus: chunk.map(p => p.sku || p._id?.toString())
    });
    
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      const attempt = retryCount + 1;
      // Get current values from process.env
      const wordpressUrl = process.env.WORDPRESS_URL || '';
      const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
      const syncUrl = `${wordpressUrl}/wp-json/wc-pos-sync/v1/sync-products`;
      
      try {
        console.log(`[WooCommerce Sync] Chunk ${chunkIndex + 1} - Attempt ${attempt}/${maxRetries + 1}:`, {
          url: syncUrl,
          method: 'POST',
          productsCount: wcProducts.length,
          payloadSize: `${JSON.stringify(wcProducts).length} bytes`,
          timeout: `${timeout}ms`,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': wordpressApiKey ? `${wordpressApiKey.substring(0, 8)}...${wordpressApiKey.substring(wordpressApiKey.length - 4)}` : 'NOT SET'
          }
        });
        
        const requestStartTime = Date.now();
    const response = await axios.post(
          syncUrl,
      wcProducts,
      {
        headers: {
          'Content-Type': 'application/json',
              'X-API-Key': wordpressApiKey
            },
            timeout: timeout
          }
        );
        const requestDuration = Date.now() - requestStartTime;
        
        console.log(`[WooCommerce Sync] ✅ Chunk ${chunkIndex + 1} success (${requestDuration}ms):`, {
          status: response.status,
          statusText: response.statusText,
          responseDataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          responseDataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
        });
        
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
              // Parse WordPress error if present
              let parsedError = item?.error || 'Unknown error';
              if (item?.error?.data?.error) {
                const wpError = item.error.data.error;
                if (wpError.message?.includes('SKU') && wpError.message?.includes('already present')) {
                  const skuMatch = wpError.message.match(/SKU \(([^)]+)\)/);
                  const conflictingSku = skuMatch ? skuMatch[1] : 'unknown';
                  parsedError = {
                    code: 'sku_conflict',
                    message: `Product with SKU "${conflictingSku}" already exists in WooCommerce. The plugin should update existing products.`,
                    data: {
                      status: item.error.data?.status,
                      wordpressError: {
                        message: wpError.message,
                        file: wpError.file,
                        line: wpError.line
                      },
                      hint: 'Product may need to be deleted from WooCommerce first, or the WordPress plugin needs to handle updates instead of creates.'
                    }
                  };
                } else {
                  parsedError = {
                    code: item.error.code || 'wordpress_error',
                    message: wpError.message || item.error.message,
                    data: item.error.data
                  };
                }
              }
              
              results.failed.push({
                product: chunk[index].name,
                sku: chunk[index].sku || chunk[index]._id?.toString(),
                error: parsedError
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

        const chunkDuration = Date.now() - chunkStartTime;
        console.log(`[WooCommerce Sync] ✅ Chunk ${chunkIndex + 1}/${chunks.length} completed (${chunkDuration}ms):`, {
          productsInChunk: chunk.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          progress: `${chunkIndex + 1}/${chunks.length}`
        });
        console.log(`✅ Synced chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} products)`);
        success = true;
  } catch (error) {
        retryCount++;
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const isAuthError = error.response?.status === 401 || error.response?.status === 403;
        const isServerError = error.response?.status === 500;
        const errorData = error.response?.data || {};
        
        // Parse WordPress error messages
        let errorMessage = error.message || 'Unknown error';
        let parsedError = null;
        
        if (isServerError && errorData.data?.error) {
          // Extract actual error from WordPress 500 response
          const wpError = errorData.data.error;
          parsedError = {
            type: wpError.type,
            message: wpError.message,
            file: wpError.file,
            line: wpError.line
          };
          
          // Extract SKU conflict message if present
          if (wpError.message && wpError.message.includes('SKU') && wpError.message.includes('already present')) {
            const skuMatch = wpError.message.match(/SKU \(([^)]+)\)/);
            const conflictingSku = skuMatch ? skuMatch[1] : 'unknown';
            errorMessage = `Product with SKU "${conflictingSku}" already exists in WooCommerce. The WordPress plugin should update existing products instead of creating new ones.`;
          } else {
            errorMessage = wpError.message || errorData.message || error.message;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        console.error(`[WooCommerce Sync] ❌ Chunk ${chunkIndex + 1} - Attempt ${attempt} failed:`, {
          chunkIndex: chunkIndex + 1,
          attempt,
          errorType: isTimeout ? 'TIMEOUT' : isAuthError ? 'AUTH_ERROR' : isServerError ? 'WORDPRESS_ERROR' : 'OTHER',
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorCode: error.code,
          errorMessage: error.message,
          parsedError: parsedError,
          responseData: error.response?.data,
          willRetry: retryCount <= maxRetries && !isAuthError && !isServerError
        });

        // Don't retry authentication errors - they won't succeed
        if (isAuthError && retryCount === 1) {
          console.error(`[WooCommerce Sync] ❌ Authentication error detected - aborting chunk:`, {
            chunkIndex: chunkIndex + 1,
            status: error.response?.status,
            error: errorMessage,
            productsAffected: chunk.length,
            hint: 'Check WORDPRESS_API_KEY in .env file matches WordPress plugin settings'
          });
          console.error(`❌ Authentication error: ${errorMessage}`);
          console.error(`   Status: ${error.response?.status}`);
          console.error(`   Check your WORDPRESS_API_KEY in .env file`);
          console.error(`   Verify the API key matches the one configured in WordPress plugin`);
          
          chunk.forEach(product => {
            results.failed.push({
              product: product.name,
              sku: product.sku || product._id?.toString(),
              error: {
                code: errorData.code || 'authentication_error',
                message: `Authentication failed: ${errorMessage}. Please verify WORDPRESS_API_KEY in your .env file matches the API key in WordPress plugin settings.`,
                data: {
                  status: error.response?.status,
                  hint: 'Check WordPress Admin → POS Sync → Settings for the correct API key'
                }
              }
            });
          });
          break; // Don't retry auth errors
        }

        if (retryCount > maxRetries || isServerError) {
          // Max retries reached or server error (don't retry server errors)
          const finalError = isServerError 
            ? {
                code: errorData.code || 'wordpress_server_error',
                message: errorMessage,
                data: {
                  status: error.response?.status,
                  wordpressError: parsedError,
                  hint: isServerError && parsedError?.message?.includes('SKU') 
                    ? 'Product already exists in WooCommerce. The WordPress plugin should handle updates. Check if products need to be deleted first or if the plugin needs to be updated.'
                    : 'WordPress plugin encountered an error. Check WordPress error logs for details.'
                }
              }
            : (isTimeout 
                ? 'Request timeout - WooCommerce server took too long to respond' 
                : errorData || errorMessage);
          
          console.error(`[WooCommerce Sync] ❌ Chunk ${chunkIndex + 1} failed:`, {
            chunkIndex: chunkIndex + 1,
            productsAffected: chunk.length,
            error: errorMessage,
            isTimeout,
            isServerError,
            retries: retryCount
          });
          console.error(`❌ Failed to sync chunk ${chunkIndex + 1}/${chunks.length}`);
          
          chunk.forEach(product => {
            results.failed.push({
              product: product.name,
              sku: product.sku || product._id?.toString(),
              error: finalError
            });
          });
          
          if (isServerError) {
            break; // Don't retry server errors
          }
        } else {
          // Retry with exponential backoff (skip if auth error)
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          console.warn(`[WooCommerce Sync] ⚠️  Retrying chunk ${chunkIndex + 1} in ${delay}ms:`, {
            chunkIndex: chunkIndex + 1,
            attempt: `${retryCount}/${maxRetries}`,
            delay: `${delay}ms`,
            nextAttempt: retryCount + 1
          });
          console.warn(`⚠️  Chunk ${chunkIndex + 1}/${chunks.length} failed (attempt ${retryCount}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  const totalDuration = Date.now() - (Date.now() - (results.total * 100)); // Approximate
  console.log(`[WooCommerce Sync] 📊 Batch sync completed:`, {
    totalProducts: results.total,
    succeeded: results.success.length,
    failed: results.failed.length,
    successRate: `${((results.success.length / results.total) * 100).toFixed(1)}%`,
    chunksProcessed: chunks.length
  });
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
    // Get current values from process.env
    const wordpressUrl = process.env.WORDPRESS_URL || '';
    const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
    
    const response = await axios.post(
      `${wordpressUrl}/wp-json/wc-pos-sync/v1/delete-product`,
      { sku },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': wordpressApiKey
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
  // Check process.env directly instead of module constants
  const wordpressUrl = process.env.WORDPRESS_URL || '';
  const wordpressApiKey = process.env.WORDPRESS_API_KEY || '';
  
  if (!wordpressUrl || !wordpressApiKey) {
    console.log('[WooCommerce Sync] Status check failed - missing configuration:', {
      WORDPRESS_URL: wordpressUrl ? 'SET' : 'NOT SET',
      WORDPRESS_API_KEY: wordpressApiKey ? 'SET' : 'NOT SET'
    });
    return {
      enabled: false,
      message: 'WordPress URL or API key not configured'
    };
  }

  const statusUrl = `${wordpressUrl}/wp-json/wc-pos-sync/v1/status`;
  console.log('[WooCommerce Sync] Checking WordPress plugin status:', {
    url: statusUrl,
    apiKeyLength: wordpressApiKey.length,
    apiKeyPreview: `${wordpressApiKey.substring(0, 8)}...${wordpressApiKey.substring(wordpressApiKey.length - 4)}`
  });

  try {
    const startTime = Date.now();
    const response = await axios.get(
      statusUrl,
      {
        headers: {
          'X-API-Key': wordpressApiKey
        },
        timeout: 10000
      }
    );
    const duration = Date.now() - startTime;
    
    console.log('[WooCommerce Sync] ✅ Status check successful:', {
      status: response.status,
      duration: `${duration}ms`,
      responseData: response.data
    });
    
    return {
      enabled: true,
      connected: true,
      status: response.data
    };
  } catch (error) {
    console.error('[WooCommerce Sync] ❌ Status check failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorCode: error.code,
      errorMessage: error.message,
      responseData: error.response?.data,
      isAuthError: error.response?.status === 401 || error.response?.status === 403
    });
    
    return {
      enabled: true,
      connected: false,
      error: error.response?.data || error.message
    };
  }
}
