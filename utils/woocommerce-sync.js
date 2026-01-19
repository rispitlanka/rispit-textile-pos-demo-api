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
export function transformProductToWooCommerce(posProduct) {
  // Handle both populated and non-populated category
  let categoryName = posProduct.category;
  if (typeof posProduct.category === 'object' && posProduct.category.name) {
    categoryName = posProduct.category.name;
  }

  // Build images array
  const images = [];
  if (posProduct.image) {
    images.push(posProduct.image);
  }
  
  // Add variation combination images if they exist
  if (posProduct.variationCombinations && posProduct.variationCombinations.length > 0) {
    posProduct.variationCombinations.forEach(combination => {
      if (combination.image) {
        images.push(combination.image);
      }
    });
  }

  // Calculate stock status
  const totalStock = posProduct.stock || 0;
  let stockStatus = 'outofstock';
  if (totalStock > 0) {
    stockStatus = 'instock';
  } else if (totalStock === 0 && posProduct.minStock > 0) {
    stockStatus = 'outofstock';
  }

  // Build meta data
  const metaData = [
    { key: 'pos_product_id', value: posProduct._id.toString() },
    { key: 'pos_last_synced', value: new Date().toISOString() }
  ];

  // Add variation info if product has variations
  if (posProduct.hasVariations) {
    metaData.push({ key: 'pos_has_variations', value: 'true' });
    if (posProduct.variationCombinations && posProduct.variationCombinations.length > 0) {
      metaData.push({ 
        key: 'pos_variation_count', 
        value: posProduct.variationCombinations.length.toString() 
      });
    }
  }

  // Build WooCommerce product object
  const wcProduct = {
    sku: posProduct.sku || posProduct._id.toString(),
    name: posProduct.name,
    price: posProduct.sellingPrice || posProduct.price || 0,
    description: posProduct.description || '',
    short_description: posProduct.name,
    stock_quantity: totalStock,
    manage_stock: true,
    stock_status: stockStatus,
    categories: categoryName ? [categoryName] : [],
    images: images,
    meta_data: metaData
  };

  // Add optional fields if they exist
  if (posProduct.purchasePrice) {
    wcProduct.meta_data.push({ 
      key: 'pos_purchase_price', 
      value: posProduct.purchasePrice.toString() 
    });
  }

  if (posProduct.minStock !== undefined) {
    wcProduct.meta_data.push({ 
      key: 'pos_min_stock', 
      value: posProduct.minStock.toString() 
    });
  }

  if (posProduct.barcodeId) {
    wcProduct.meta_data.push({ 
      key: 'pos_barcode_id', 
      value: posProduct.barcodeId 
    });
  }

  if (posProduct.unit) {
    wcProduct.meta_data.push({ 
      key: 'pos_unit', 
      value: posProduct.unit 
    });
  }

  if (posProduct.taxRate) {
    wcProduct.meta_data.push({ 
      key: 'pos_tax_rate', 
      value: posProduct.taxRate.toString() 
    });
  }

  return wcProduct;
}

/**
 * Sync single product to WooCommerce
 */
export async function syncProductToWooCommerce(posProduct) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('⚠️  WooCommerce sync is disabled or not configured. Skipping product sync.');
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
    console.error('❌ Error syncing product to WooCommerce:', {
      productName: posProduct.name,
      sku: posProduct.sku,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Don't throw error - allow product operations to continue even if sync fails
    return null;
  }
}

/**
 * Sync multiple products to WooCommerce
 */
export async function syncProductsToWooCommerce(posProducts) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('⚠️  WooCommerce sync is disabled or not configured. Skipping batch sync.');
    return null;
  }

  if (!posProducts || posProducts.length === 0) {
    console.log('⚠️  No products provided for sync.');
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
    
    if (response.data.results) {
      const { success, failed } = response.data.results;
      if (failed && failed.length > 0) {
        console.warn(`⚠️  ${failed.length} products failed to sync:`, failed);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error syncing products to WooCommerce:', {
      productCount: posProducts.length,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    return null;
  }
}

/**
 * Delete product from WooCommerce
 */
export async function deleteProductFromWooCommerce(sku) {
  if (!isWooCommerceSyncEnabled()) {
    console.log('⚠️  WooCommerce sync is disabled or not configured. Skipping product deletion.');
    return null;
  }

  if (!sku) {
    console.warn('⚠️  No SKU provided for product deletion.');
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
    console.error('❌ Error deleting product from WooCommerce:', {
      sku,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Don't throw error - allow deletion to continue even if sync fails
    return null;
  }
}

/**
 * Check WordPress plugin status
 */
export async function checkWordPressPluginStatus() {
  if (!WORDPRESS_URL || !WORDPRESS_API_KEY) {
    return {
      enabled: false,
      error: 'WordPress URL or API key not configured'
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
      status: response.data.status,
      woocommerce_active: response.data.woocommerce_active,
      version: response.data.version
    };
  } catch (error) {
    return {
      enabled: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}
