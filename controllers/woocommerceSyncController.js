import Product from '../models/Product.js';
import {
  syncProductToWooCommerce,
  syncProductsToWooCommerce,
  deleteProductFromWooCommerce,
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
        message: 'WooCommerce sync is not enabled. Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and set SYNC_TO_WOOCOMMERCE=true in your .env file.'
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
    
    if (result && result.success === false) {
      return res.status(500).json({
        success: false,
        message: 'Failed to sync product to WooCommerce',
        error: result.error
      });
    }

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
        message: 'WooCommerce sync is not enabled. Please configure WORDPRESS_URL, WORDPRESS_API_KEY, and set SYNC_TO_WOOCOMMERCE=true in your .env file.'
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
        message: 'No products to sync',
        results: {
          success: [],
          failed: []
        }
      });
    }

    const result = await syncProductsToWooCommerce(products);
    
    if (result && result.success === false) {
      return res.status(500).json({
        success: false,
        message: 'Failed to sync products to WooCommerce',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Synced ${products.length} products to WooCommerce`,
      synced: products.length,
      results: result?.results || result
    });
  } catch (error) {
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
    const status = await checkWordPressPluginStatus();
    
    res.json({
      success: true,
      syncEnabled: isWooCommerceSyncEnabled(),
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
