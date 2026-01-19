import axios from 'axios';

const WORDPRESS_URL = process.env.WORDPRESS_URL || '';
const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY || '';
const SYNC_TO_WOOCOMMERCE = process.env.SYNC_TO_WOOCOMMERCE === 'true';

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
 * Sync single product to WooCommerce
 */
export async function syncProductToWooCommerce(posProduct) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('WooCommerce sync is disabled or not configured. Skipping product sync.');
    return null;
  }

  try {
    const wcProduct = transformProductToWooCommerce(posProduct);
    
    const response = await axios.post(
      `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/sync-product`,
      wcProduct,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WORDPRESS_API_KEY
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log(`✅ Product synced to WooCommerce: ${posProduct.name} (SKU: ${wcProduct.sku})`);
    return response.data;
  } catch (error) {
    // Log error but don't throw - we don't want to break product operations
    console.error(`❌ Error syncing product to WooCommerce (${posProduct.name}):`, 
      error.response?.data || error.message);
    
    // Return error info for optional handling
    return {
      success: false,
      error: error.response?.data || error.message,
      product: posProduct.name
    };
  }
}

/**
 * Sync multiple products to WooCommerce
 */
export async function syncProductsToWooCommerce(posProducts) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('WooCommerce sync is disabled or not configured. Skipping batch sync.');
    return null;
  }

  try {
    const wcProducts = posProducts.map(transformProductToWooCommerce);
    
    const response = await axios.post(
      `${WORDPRESS_URL}/wp-json/wc-pos-sync/v1/sync-products`,
      wcProducts,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WORDPRESS_API_KEY
        },
        timeout: 60000 // 60 second timeout for batch operations
      }
    );
    
    console.log(`✅ Synced ${wcProducts.length} products to WooCommerce`);
    return response.data;
  } catch (error) {
    console.error('❌ Error syncing products to WooCommerce:', 
      error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message
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
