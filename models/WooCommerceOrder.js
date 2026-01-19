import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  product_id: Number,
  variation_id: Number,
  quantity: Number,
  subtotal: Number,
  total: Number,
  tax: Number,
  sku: String,
  meta_data: [{
    key: String,
    value: mongoose.Schema.Types.Mixed
  }]
});

const billingAddressSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  company: String,
  address_1: String,
  address_2: String,
  city: String,
  state: String,
  postcode: String,
  country: String,
  email: String,
  phone: String
});

const shippingAddressSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  company: String,
  address_1: String,
  address_2: String,
  city: String,
  state: String,
  postcode: String,
  country: String
});

const shippingLineSchema = new mongoose.Schema({
  id: Number,
  method_title: String,
  method_id: String,
  total: Number,
  total_tax: Number
});

const taxLineSchema = new mongoose.Schema({
  id: Number,
  rate_code: String,
  rate_id: Number,
  label: String,
  compound: Boolean,
  tax_total: Number,
  shipping_tax_total: Number
});

const feeLineSchema = new mongoose.Schema({
  id: Number,
  name: String,
  total: Number,
  total_tax: Number
});

const couponLineSchema = new mongoose.Schema({
  id: Number,
  code: String,
  discount: Number,
  discount_tax: Number
});

const statusChangeSchema = new mongoose.Schema({
  old_status: String,
  new_status: String,
  changed_at: {
    type: Date,
    default: Date.now
  }
});

const wooCommerceOrderSchema = new mongoose.Schema({
  // WooCommerce order fields
  wc_order_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  order_number: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    index: true
  },
  currency: String,
  date_created: Date,
  date_modified: Date,
  
  // Financial details
  total: {
    type: Number,
    required: true
  },
  subtotal: Number,
  total_tax: Number,
  total_shipping: Number,
  discount_total: Number,
  
  // Payment details
  payment_method: String,
  payment_method_title: String,
  transaction_id: String,
  
  // Customer details
  customer_id: Number,
  customer_ip_address: String,
  customer_user_agent: String,
  customer_note: String,
  
  // Addresses
  billing: billingAddressSchema,
  shipping: shippingAddressSchema,
  
  // Order items
  line_items: [lineItemSchema],
  shipping_lines: [shippingLineSchema],
  tax_lines: [taxLineSchema],
  fee_lines: [feeLineSchema],
  coupon_lines: [couponLineSchema],
  
  // Meta data
  meta_data: [{
    key: String,
    value: mongoose.Schema.Types.Mixed
  }],
  
  // Webhook tracking
  event_type: {
    type: String,
    enum: ['order.created', 'order.status_changed'],
    required: true
  },
  webhook_received_at: {
    type: Date,
    default: Date.now
  },
  
  // Status change history
  status_changes: [statusChangeSchema],
  
  // Processing status
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processed_at: Date,
  processing_error: String,
  
  // Link to local POS sale (if converted)
  pos_sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
wooCommerceOrderSchema.index({ wc_order_id: 1 });
wooCommerceOrderSchema.index({ order_number: 1 });
wooCommerceOrderSchema.index({ status: 1 });
wooCommerceOrderSchema.index({ processed: 1 });
wooCommerceOrderSchema.index({ event_type: 1 });
wooCommerceOrderSchema.index({ createdAt: -1 });
wooCommerceOrderSchema.index({ 'billing.email': 1 });

export default mongoose.model('WooCommerceOrder', wooCommerceOrderSchema);
