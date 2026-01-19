import Product from '../models/Product.js';
import {
  syncProductToWooCommerce,
  syncProductsToWooCommerce,
  deleteProductFromWooCommerce,
  checkWordPressPluginStatus,
  isWooCommerceSyncEnabled,
  validateWooCommerceConfig
} from '../utils/woocommerce-sync.js';

/**
 * Sync single product to WooCommerce
 * POST /api/woocommerce/sync-product/:id
 */
export const syncProduct = async (req, res) => {
  const requestId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[WooCommerce Sync Controller] 📥 Sync single product request received:`, {
    requestId,
    productId: req.params.id,
    timestamp: new Date().toISOString()
  });

  try {
    if (!isWooCommerceSyncEnabled()) {
      const configValidation = validateWooCommerceConfig();
      console.log(`[WooCommerce Sync Controller] ❌ Sync disabled:`, {
        requestId,
        issues: configValidation.issues
      });
      return res.status(400).json({
        success: false,
        message: 'WooCommerce sync is not enabled or not properly configured.',
        issues: configValidation.issues,
        help: 'Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and set SYNC_TO_WOOCOMMERCE=true in your .env file.'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.log(`[WooCommerce Sync Controller] ❌ Product not found:`, {
        requestId,
        productId: req.params.id
      });
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log(`[WooCommerce Sync Controller] ✅ Product found, starting sync:`, {
      requestId,
      productId: product._id.toString(),
      productName: product.name,
      sku: product.sku
    });

    const result = await syncProductToWooCommerce(product);
    
    if (result && result.success === false) {
      console.log(`[WooCommerce Sync Controller] ❌ Sync failed:`, {
        requestId,
        productId: product._id.toString(),
        error: result.error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to sync product to WooCommerce',
        error: result.error
      });
    }

    console.log(`[WooCommerce Sync Controller] ✅ Sync completed successfully:`, {
      requestId,
      productId: product._id.toString(),
      productName: product.name
    });

    res.json({
      success: true,
      message: 'Product synced to WooCommerce successfully',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku
      },
      wooCommerce: result
    });
  } catch (error) {
    console.error(`[WooCommerce Sync Controller] ❌ Unexpected error:`, {
      requestId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Sync all products to WooCommerce
 * POST /api/woocommerce/sync-all
 */
export const syncAllProducts = async (req, res) => {
  const requestId = `sync-all-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[WooCommerce Sync Controller] 📥 Sync all products request received:`, {
    requestId,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  try {
    if (!isWooCommerceSyncEnabled()) {
      const configValidation = validateWooCommerceConfig();
      console.log(`[WooCommerce Sync Controller] ❌ Sync disabled:`, {
        requestId,
        issues: configValidation.issues
      });
      return res.status(400).json({
        success: false,
        message: 'WooCommerce sync is not enabled or not properly configured.',
        issues: configValidation.issues,
        help: 'Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and set SYNC_TO_WOOCOMMERCE=true in your .env file.'
      });
    }

    const { limit = 100, skip = 0 } = req.query;
    
    console.log(`[WooCommerce Sync Controller] 🔍 Fetching products from database:`, {
      requestId,
      limit: parseInt(limit),
      skip: parseInt(skip),
      filter: { isActive: true }
    });

    const products = await Product.find({ isActive: true })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    console.log(`[WooCommerce Sync Controller] ✅ Products fetched:`, {
      requestId,
      count: products.length,
      productIds: products.map(p => p._id.toString()),
      productNames: products.map(p => p.name)
    });

    if (products.length === 0) {
      console.log(`[WooCommerce Sync Controller] ⚠️  No products to sync:`, {
        requestId
      });
      return res.json({
        success: true,
        message: 'No products to sync',
        results: {
          success: [],
          failed: []
        }
      });
    }

    // Allow custom chunk size via query parameter
    const chunkSize = parseInt(req.query.chunkSize) || 20;
    
    console.log(`[WooCommerce Sync Controller] 🚀 Starting batch sync:`, {
      requestId,
      totalProducts: products.length,
      chunkSize,
      timeout: '120000ms',
      maxRetries: 3
    });
    
    const result = await syncProductsToWooCommerce(products, {
      chunkSize: chunkSize,
      timeout: 120000, // 2 minutes per chunk
      maxRetries: 3
    });
    
    if (!result) {
      console.log(`[WooCommerce Sync Controller] ❌ Sync returned null:`, {
        requestId,
        reason: 'sync is not enabled or configured'
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to sync products to WooCommerce - sync is not enabled or configured'
      });
    }

    console.log(`[WooCommerce Sync Controller] 📊 Sync results:`, {
      requestId,
      success: result.success,
      succeeded: result.results?.success?.length || 0,
      failed: result.results?.failed?.length || 0,
      total: products.length
    });

    if (result.success === false && result.results?.failed?.length === products.length) {
      // All products failed
      console.log(`[WooCommerce Sync Controller] ❌ All products failed to sync:`, {
        requestId,
        failedCount: result.results.failed.length,
        errors: result.results.failed.map(f => ({ product: f.product, error: f.error }))
      });
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to sync products to WooCommerce',
        error: result.error,
        results: result.results
      });
    }

    // Partial or full success
    const statusCode = result.success === false ? 207 : 200; // 207 Multi-Status for partial success
    
    console.log(`[WooCommerce Sync Controller] ✅ Sync completed:`, {
      requestId,
      statusCode,
      success: result.success !== false,
      synced: result.results?.success?.length || 0,
      failed: result.results?.failed?.length || 0
    });
    
    res.status(statusCode).json({
      success: result.success !== false,
      message: result.message || `Synced ${products.length} products to WooCommerce`,
      synced: result.results?.success?.length || 0,
      failed: result.results?.failed?.length || 0,
      total: products.length,
      results: result.results
    });
  } catch (error) {
    console.error(`[WooCommerce Sync Controller] ❌ Unexpected error:`, {
      requestId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Check WooCommerce plugin connection status
 * GET /api/woocommerce/status
 */
export const getSyncStatus = async (req, res) => {
  try {
    const configValidation = validateWooCommerceConfig();
    const status = await checkWordPressPluginStatus();
    
    res.json({
      success: true,
      syncEnabled: isWooCommerceSyncEnabled(),
      configValid: configValidation.valid,
      configIssues: configValidation.issues.length > 0 ? configValidation.issues : undefined,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete product from WooCommerce
 * DELETE /api/woocommerce/delete-product/:id
 */
export const deleteProductFromWC = async (req, res) => {
  try {
    if (!isWooCommerceSyncEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'WooCommerce sync is not enabled'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.sku) {
      return res.status(400).json({
        success: false,
        message: 'Product does not have a SKU'
      });
    }

    const result = await deleteProductFromWooCommerce(product.sku);
    
    if (result && result.success === false) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product from WooCommerce',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Product deleted from WooCommerce successfully',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku
      },
      wooCommerce: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
