import WooCommerceOrder from '../models/WooCommerceOrder.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

/**
 * Receive order webhook from WooCommerce
 * POST /api/webhooks/orders
 */
export const receiveOrderWebhook = async (req, res) => {
  try {
    const { event, timestamp, data } = req.body;
    
    // Validate required fields
    if (!event || !data) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Missing required fields: event and data are required'
      });
    }
    
    console.log(`📦 Webhook received: ${event} at ${timestamp || new Date().toISOString()}`);
    console.log(`Order #${data.order_number} - Status: ${data.status}`);
    
    // Check if order already exists
    let existingOrder = await WooCommerceOrder.findOne({ wc_order_id: data.id });
    
    if (existingOrder) {
      // Update existing order
      console.log(`Updating existing order #${data.order_number}`);
      
      // Add status change to history if status changed
      if (data.status_change) {
        existingOrder.status_changes.push({
          old_status: data.status_change.old_status,
          new_status: data.status_change.new_status,
          changed_at: new Date()
        });
      }
      
      // Update order data
      existingOrder.status = data.status;
      existingOrder.date_modified = data.date_modified || new Date();
      existingOrder.event_type = event;
      existingOrder.webhook_received_at = new Date();
      existingOrder.line_items = data.line_items || existingOrder.line_items;
      existingOrder.billing = data.billing || existingOrder.billing;
      existingOrder.shipping = data.shipping || existingOrder.shipping;
      existingOrder.total = data.total || existingOrder.total;
      existingOrder.subtotal = data.subtotal || existingOrder.subtotal;
      existingOrder.meta_data = data.meta_data || existingOrder.meta_data;
      
      await existingOrder.save();
      
      // Process based on event type
      await processOrderWebhook(event, existingOrder);
      
      return res.status(200).json({
        success: true,
        message: 'Order webhook received and updated successfully',
        event: event,
        order_id: data.id,
        order_number: data.order_number,
        wc_order_db_id: existingOrder._id
      });
    } else {
      // Create new order record
      console.log(`Creating new order #${data.order_number}`);
      
      const orderData = {
        wc_order_id: data.id,
        order_number: data.order_number,
        status: data.status,
        currency: data.currency,
        date_created: data.date_created || new Date(),
        date_modified: data.date_modified || new Date(),
        total: data.total,
        subtotal: data.subtotal,
        total_tax: data.total_tax,
        total_shipping: data.total_shipping,
        discount_total: data.discount_total,
        payment_method: data.payment_method,
        payment_method_title: data.payment_method_title,
        transaction_id: data.transaction_id,
        customer_id: data.customer_id,
        customer_ip_address: data.customer_ip_address,
        customer_user_agent: data.customer_user_agent,
        customer_note: data.customer_note,
        billing: data.billing,
        shipping: data.shipping,
        line_items: data.line_items || [],
        shipping_lines: data.shipping_lines || [],
        tax_lines: data.tax_lines || [],
        fee_lines: data.fee_lines || [],
        coupon_lines: data.coupon_lines || [],
        meta_data: data.meta_data || [],
        event_type: event,
        webhook_received_at: new Date()
      };
      
      // Add initial status change if provided
      if (data.status_change) {
        orderData.status_changes = [{
          old_status: data.status_change.old_status,
          new_status: data.status_change.new_status,
          changed_at: new Date()
        }];
      }
      
      const newOrder = new WooCommerceOrder(orderData);
      await newOrder.save();
      
      // Process based on event type
      await processOrderWebhook(event, newOrder);
      
      return res.status(200).json({
        success: true,
        message: 'Order webhook received successfully',
        event: event,
        order_id: data.id,
        order_number: data.order_number,
        wc_order_db_id: newOrder._id
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing order webhook:', error);
    
    // Log error but still return 200 to prevent retries for processing errors
    // Return 500 if you want WordPress to retry the webhook
    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Webhook received but processing failed'
    });
  }
};

/**
 * Process webhook based on event type
 */
async function processOrderWebhook(eventType, order) {
  try {
    switch (eventType) {
      case 'order.created':
        await handleOrderCreated(order);
        break;
      case 'order.status_changed':
        await handleOrderStatusChanged(order);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    order.processing_error = error.message;
    await order.save();
  }
}

/**
 * Handle new order creation
 */
async function handleOrderCreated(order) {
  console.log(`🆕 Processing new order #${order.order_number}`);
  
  try {
    // Update inventory based on order items
    await updateInventoryFromOrder(order);
    
    // Optionally sync customer data
    await syncCustomerFromOrder(order);
    
    // Mark as processed
    order.processed = true;
    order.processed_at = new Date();
    await order.save();
    
    console.log(`✅ Order #${order.order_number} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing order #${order.order_number}:`, error);
    throw error;
  }
}

/**
 * Handle order status change
 */
async function handleOrderStatusChanged(order) {
  const latestChange = order.status_changes[order.status_changes.length - 1];
  
  if (latestChange) {
    console.log(`🔄 Order #${order.order_number} status changed: ${latestChange.old_status} → ${latestChange.new_status}`);
  }
  
  try {
    // Handle different status changes
    switch (order.status) {
      case 'processing':
        console.log('Order is being processed');
        break;
      case 'completed':
        console.log('Order is completed');
        await handleOrderCompleted(order);
        break;
      case 'cancelled':
        console.log('Order is cancelled');
        await handleOrderCancelled(order);
        break;
      case 'refunded':
        console.log('Order is refunded');
        await handleOrderRefunded(order);
        break;
      default:
        console.log(`Status changed to: ${order.status}`);
    }
    
    // Mark as processed
    order.processed = true;
    order.processed_at = new Date();
    await order.save();
    
  } catch (error) {
    console.error('Error handling status change:', error);
    throw error;
  }
}

/**
 * Update inventory based on order items
 */
async function updateInventoryFromOrder(order) {
  console.log('Updating inventory from order...');
  
  for (const item of order.line_items) {
    if (!item.sku) continue;
    
    try {
      // Find product by SKU
      const product = await Product.findOne({ sku: item.sku });
      
      if (product) {
        // Reduce stock by quantity ordered
        const newStock = Math.max(0, product.stock - item.quantity);
        product.stock = newStock;
        
        // Update stock status
        if (newStock === 0) {
          product.stockStatus = 'out-of-stock';
        } else if (newStock < product.lowStockThreshold) {
          product.stockStatus = 'low-stock';
        }
        
        await product.save();
        console.log(`Updated stock for ${product.name} (SKU: ${item.sku}): ${newStock} remaining`);
      } else {
        console.warn(`Product not found with SKU: ${item.sku}`);
      }
    } catch (error) {
      console.error(`Error updating inventory for SKU ${item.sku}:`, error);
    }
  }
}

/**
 * Restore inventory when order is cancelled
 */
async function handleOrderCancelled(order) {
  console.log('Restoring inventory for cancelled order...');
  
  for (const item of order.line_items) {
    if (!item.sku) continue;
    
    try {
      const product = await Product.findOne({ sku: item.sku });
      
      if (product) {
        // Restore stock
        product.stock += item.quantity;
        
        // Update stock status
        if (product.stock > product.lowStockThreshold) {
          product.stockStatus = 'in-stock';
        } else if (product.stock > 0) {
          product.stockStatus = 'low-stock';
        }
        
        await product.save();
        console.log(`Restored stock for ${product.name} (SKU: ${item.sku}): ${product.stock} available`);
      }
    } catch (error) {
      console.error(`Error restoring inventory for SKU ${item.sku}:`, error);
    }
  }
}

/**
 * Handle completed orders
 */
async function handleOrderCompleted(order) {
  console.log('Processing completed order...');
  // Add any additional logic for completed orders
  // For example: send confirmation email, update analytics, etc.
}

/**
 * Handle refunded orders
 */
async function handleOrderRefunded(order) {
  console.log('Processing refunded order...');
  // Restore inventory similar to cancelled orders
  await handleOrderCancelled(order);
}

/**
 * Sync customer data from order
 */
async function syncCustomerFromOrder(order) {
  if (!order.billing || !order.billing.email) {
    return;
  }
  
  try {
    // Check if customer exists
    let customer = await Customer.findOne({ email: order.billing.email });
    
    if (!customer) {
      // Create new customer
      customer = new Customer({
        name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        email: order.billing.email,
        phone: order.billing.phone || '',
        address: order.billing.address_1 || '',
        city: order.billing.city || '',
        state: order.billing.state || '',
        zipCode: order.billing.postcode || '',
        country: order.billing.country || '',
        source: 'woocommerce',
        notes: `Synced from WooCommerce order #${order.order_number}`
      });
      
      await customer.save();
      console.log(`Created new customer: ${customer.name} (${customer.email})`);
    } else {
      console.log(`Customer already exists: ${customer.name} (${customer.email})`);
    }
  } catch (error) {
    console.error('Error syncing customer:', error);
  }
}

/**
 * Get all WooCommerce orders
 * GET /api/webhooks/orders
 */
export const getWooCommerceOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      processed,
      event_type,
      search
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (processed !== undefined) {
      query.processed = processed === 'true';
    }
    
    if (event_type) {
      query.event_type = event_type;
    }
    
    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { 'billing.email': { $regex: search, $options: 'i' } },
        { 'billing.first_name': { $regex: search, $options: 'i' } },
        { 'billing.last_name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const orders = await WooCommerceOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('pos_sale_id');
    
    const total = await WooCommerceOrder.countDocuments(query);
    
    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get single WooCommerce order by ID
 * GET /api/webhooks/orders/:id
 */
export const getWooCommerceOrder = async (req, res) => {
  try {
    const order = await WooCommerceOrder.findById(req.params.id)
      .populate('pos_sale_id');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error fetching WooCommerce order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get order statistics
 * GET /api/webhooks/orders/stats
 */
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await WooCommerceOrder.countDocuments();
    const processedOrders = await WooCommerceOrder.countDocuments({ processed: true });
    const pendingOrders = await WooCommerceOrder.countDocuments({ processed: false });
    
    const ordersByStatus = await WooCommerceOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);
    
    const recentOrders = await WooCommerceOrder.find()
      .sort({ webhook_received_at: -1 })
      .limit(5)
      .select('order_number status total webhook_received_at');
    
    res.status(200).json({
      success: true,
      stats: {
        total: totalOrders,
        processed: processedOrders,
        pending: pendingOrders,
        byStatus: ordersByStatus,
        recent: recentOrders
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Health check endpoint for webhooks
 * GET /api/webhooks/health
 */
export const webhookHealthCheck = async (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'POS API - WooCommerce Webhook Receiver',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};
