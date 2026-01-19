/**
 * Webhook Authentication Middleware
 * Validates API key from X-API-Key header
 */

export const validateWebhookApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.WEBHOOK_API_KEY;
    
    // If no API key is configured in environment, allow all requests (for development)
    if (!expectedApiKey) {
      console.warn('WARNING: WEBHOOK_API_KEY not configured in environment variables');
      return next();
    }
    
    // Check if API key is provided
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required. Please provide X-API-Key header.'
      });
    }
    
    // Validate API key
    if (apiKey !== expectedApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid API key provided.'
      });
    }
    
    // API key is valid, proceed
    next();
  } catch (error) {
    console.error('Error in webhook authentication:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional: Validate webhook signature (if using HMAC)
 * This can be used for additional security with WooCommerce webhooks
 */
export const validateWebhookSignature = (secret) => {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-wc-webhook-signature'];
      
      if (!signature) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Webhook signature is required'
        });
      }
      
      // Create HMAC signature
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('base64');
      
      // Compare signatures
      if (signature !== hash) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid webhook signature'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An error occurred during signature validation'
      });
    }
  };
};
