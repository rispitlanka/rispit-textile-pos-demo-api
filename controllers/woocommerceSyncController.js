import Product from '../models/Product.js';
import { 
  syncProductToWooCommerce, 
  syncProductsToWooCommerce,
  checkWordPressPluginStatus,
  isWooCommerceSyncEnabled
} from '../utils/woocommerce-sync.js';

/**
 * Sync single product to WooCommerce
 * POST /api/woocommerce/sync-product/:id
 */
export const syncProduct = async (req, res) => {
  try {
    if (!isWooCommerceSyncEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'WooCommerce sync is not enabled. Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and SYNC_TO_WOOCOMMERCE in .env file.'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = await syncProductToWooCommerce(product);
    
    if (result) {
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
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to sync product to WooCommerce. Check server logs for details.'
      });
    }
  } catch (error) {
    console.error('Error syncing product:', error);
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
  try {
    if (!isWooCommerceSyncEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'WooCommerce sync is not enabled. Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and SYNC_TO_WOOCOMMERCE in .env file.'
      });
    }

    const { limit = 100, skip = 0 } = req.query;
    
    const products = await Product.find({ isActive: true })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    if (products.length === 0) {
      return res.json({
        success: true,
        message: 'No products found to sync',
        synced: 0,
        failed: 0
      });
    }

    const result = await syncProductsToWooCommerce(products);
    
    if (result) {
      res.json({
        success: true,
        message: `Synced ${products.length} products to WooCommerce`,
        synced: products.length,
        result: result.results || { success: [], failed: [] }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to sync products to WooCommerce. Check server logs for details.'
      });
    }
  } catch (error) {
    console.error('Error syncing products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Check WordPress plugin status
 * GET /api/woocommerce/status
 */
export const getSyncStatus = async (req, res) => {
  try {
    const status = await checkWordPressPluginStatus();
    
    res.json({
      success: true,
      syncEnabled: isWooCommerceSyncEnabled(),
      wordPress: status
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
