import mongoose from 'mongoose';

const variationCombinationSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    sparse: true
  },
  combinationName: {
    type: String,
    required: true
  },
  variations: [{
    variationName: {
      type: String,
      required: true
    },
    selectedValue: {
      type: String,
      required: true
    }
  }],
  purchasePrice: {
    type: Number,
    min: 0
  },
  sellingPrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    default: 5
  },
  image: {
    type: String
  },
  barcodeId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  sellingPrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    default: 5
  },
  barcodeId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String
  },
  variations: [{
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariation',
      required: true
    },
    variationName: {
      type: String,
      required: true
    },
    selectedValues: [{
      valueId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      value: {
        type: String,
        required: true
      },
      priceAdjustment: {
        type: Number,
        default: 0
      }
    }]
  }],
  variationCombinations: [variationCombinationSchema],
  hasVariations: {
    type: Boolean,
    default: false
  },
  image: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'piece'
  }
}, {
  timestamps: true
});

// Generate barcode ID and SKU if not provided
productSchema.pre('save', function(next) {
  // Generate main product barcode ID if not provided
  if (!this.barcodeId) {
    this.barcodeId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  }
  
  // Generate main product SKU if not provided
  if (!this.sku) {
    this.sku = 'PRD-' + Date.now().toString() + Math.random().toString(36).substr(2, 3).toUpperCase();
  }
  
  // Generate SKU, barcode, and QR code for variation combinations
  if (this.variationCombinations && this.variationCombinations.length > 0) {
    this.variationCombinations.forEach((combination, index) => {
      // Generate SKU for combination if not provided
      if (!combination.sku) {
        combination.sku = this.sku + '-V' + (index + 1);
      }
      
      // Generate barcode ID for combination if not provided
      if (!combination.barcodeId) {
        combination.barcodeId = Date.now().toString() + Math.random().toString(36).substr(2, 5) + index;
      }
    });
  }
  
  next();
});

// Create sparse unique index on variationCombinations.sku
// This allows multiple null values but ensures uniqueness for non-null values
productSchema.index({ 'variationCombinations.sku': 1 }, { 
  unique: true, 
  sparse: true,
  name: 'variationCombinations_sku_unique'
});

export default mongoose.model('Product', productSchema);