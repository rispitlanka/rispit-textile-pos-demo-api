import Product from '../models/Product.js';
import Category from '../models/Category.js';
import ProductVariation from '../models/ProductVariation.js';
import QRCode from 'qrcode';
import { deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';
import { syncProductToWooCommerce, deleteProductFromWooCommerce } from '../utils/woocommerce-sync.js';

// Helper function to parse JSON fields from multipart form data
const parseJSONFields = (data, fields) => {
  const parsed = { ...data };
  
  fields.forEach(field => {
    if (data[field]) {
      try {
        parsed[field] = JSON.parse(data[field]);
      } catch (error) {
        throw new Error(`Invalid ${field} format. Must be a valid JSON.`);
      }
    } else {
      // Set default empty array for array fields
      if (field === 'variations' || field === 'variationCombinations') {
        parsed[field] = [];
      }
    }
  });
  
  return parsed;
};

export const createProduct = async (req, res) => {
  try {
    // Parse JSON fields from multipart form data
    const productData = parseJSONFields(req.body, ['variations', 'variationCombinations']);
    
    const product = new Product(productData);
    
    // Add uploaded product image if any
    if (req.files && req.files['image']) {
      product.image = req.files['image'][0].path;
    }

    // Process variations if they exist
    if (product.variations && product.variations.length > 0) {
      product.hasVariations = true;
      
      // Process each variation to ensure proper structure
      for (let i = 0; i < product.variations.length; i++) {
        const variation = product.variations[i];
        
        // Fetch the variation details to get the complete information
        const variationDoc = await ProductVariation.findById(variation.variationId);
        if (variationDoc) {
          variation.variationName = variationDoc.name;
          
          // Process selected values
          if (variation.selectedValues && variation.selectedValues.length > 0) {
            for (let j = 0; j < variation.selectedValues.length; j++) {
              const selectedValue = variation.selectedValues[j];
              
              // Handle both string IDs and object format
              let valueId;
              if (typeof selectedValue === 'string') {
                valueId = selectedValue;
              } else if (selectedValue && selectedValue.valueId) {
                valueId = selectedValue.valueId;
              } else {
                console.warn('Skipping invalid selected value:', selectedValue);
                continue;
              }
              
              // Find the value in the variation document
              const valueDoc = variationDoc.values.id(valueId);
              if (valueDoc && valueDoc.value) {
                variation.selectedValues[j] = {
                  valueId: valueDoc._id,
                  value: valueDoc.value,
                  priceAdjustment: valueDoc.priceAdjustment || 0
                };
              }
            }
          }
        }
      }
    }
    
    // Process variation combinations and handle images
    if (product.variationCombinations && product.variationCombinations.length > 0) {
      product.hasVariations = true;
      
      // Process each variation combination
      for (let i = 0; i < product.variationCombinations.length; i++) {
        const combination = product.variationCombinations[i];
        
        // Handle image upload for this combination
        const imageFieldName = `variationCombinations[${i}][image]`;
        if (req.files && req.files[imageFieldName]) {
          combination.image = req.files[imageFieldName][0].path;
        }
        
        // Generate combination name from variations
        if (combination.variations && combination.variations.length > 0) {
          combination.combinationName = combination.variations
            .map(v => v.selectedValue)
            .join(' / ');
        }
      }
    } else {
      product.hasVariations = false;
    }
    
    // Generate QR code for main product
    const mainQrCodeData = JSON.stringify({
      id: product._id,
      name: product.name,
      sku: product.sku || 'PRD-' + Date.now(),
      hasVariations: product.hasVariations
    });
    
    product.qrCode = await QRCode.toDataURL(mainQrCodeData);
    
    // Save product first to get the ID and generate SKUs
    await product.save();
    
    // Generate QR codes for variation combinations after SKUs are generated
    if (product.variationCombinations && product.variationCombinations.length > 0) {
      for (let i = 0; i < product.variationCombinations.length; i++) {
        const combination = product.variationCombinations[i];
        
        const combinationQRData = JSON.stringify({
          productId: product._id,
          combinationSku: combination.sku,
          name: `${product.name} - ${combination.combinationName}`,
          price: combination.sellingPrice
        });
        
        combination.qrCode = await QRCode.toDataURL(combinationQRData);
      }
      
      // Save again to update QR codes
      await product.save();
    }

    // Update category product count
    const category = await Category.findOne({ name: product.category });
    if (category) {
      await category.updateProductCount();
    }
    
    // Sync to WooCommerce (async, non-blocking)
    syncProductToWooCommerce(product).catch(err => {
      console.error('Failed to sync product to WooCommerce:', err);
      // Don't fail the request if sync fails
    });
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    // Handle JSON parsing errors specifically
    if (error.message.includes('Invalid') && error.message.includes('format')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, isActive } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcodeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body'
      });
    }

    // Process variations if they exist in the request body
    let updateData = { ...req.body };
    
    // Only process variations if they are explicitly provided in the request
    if (updateData.hasOwnProperty('variations')) {
      if (updateData.variations && updateData.variations.length > 0) {
        updateData.hasVariations = true;
        
        // Process each variation to ensure proper structure
        for (let i = 0; i < updateData.variations.length; i++) {
          const variation = updateData.variations[i];
          
          // Skip if variation is not properly structured
          if (!variation || !variation.variationId) {
            console.warn('Skipping invalid variation:', variation);
            continue;
          }
          
          // Fetch the variation details to get the complete information
          const variationDoc = await ProductVariation.findById(variation.variationId);
          if (variationDoc && variationDoc.name) {
            variation.variationName = variationDoc.name;
               // Process selected values
          if (variation.selectedValues && variation.selectedValues.length > 0) {
            for (let j = 0; j < variation.selectedValues.length; j++) {
              const selectedValue = variation.selectedValues[j];
              
              // Handle both string IDs and object format
              let valueId;
              if (typeof selectedValue === 'string') {
                valueId = selectedValue;
              } else if (selectedValue && selectedValue.valueId) {
                valueId = selectedValue.valueId;
              } else {
                console.warn('Skipping invalid selected value:', selectedValue);
                continue;
              }
              
              // Find the value in the variation document
              const valueDoc = variationDoc.values.id(valueId);
              if (valueDoc && valueDoc.value) {
                variation.selectedValues[j] = {
                  valueId: valueDoc._id,
                  value: valueDoc.value,
                  priceAdjustment: valueDoc.priceAdjustment || 0
                };
              }
            }
          }
          } else {
            console.warn('Variation document not found for ID:', variation.variationId);
          }
        }
      } else {
        // Empty variations array means remove all variations
        updateData.hasVariations = false;
      }
    }
    // If variations is not provided, don't modify existing variations

    // Process variation combinations if they exist in the request body
    if (updateData.hasOwnProperty('variationCombinations')) {
      if (updateData.variationCombinations && updateData.variationCombinations.length > 0) {
        updateData.hasVariations = true;
        
        // Process each variation combination
        for (let i = 0; i < updateData.variationCombinations.length; i++) {
          const combination = updateData.variationCombinations[i];
          
          // Skip if combination is not properly structured
          if (!combination || !combination.variations) {
            console.warn('Skipping invalid combination:', combination);
            continue;
          }
          
          // Generate combination name from variations
          if (combination.variations && combination.variations.length > 0) {
            combination.combinationName = combination.variations
              .filter(v => v && v.selectedValue) // Filter out undefined values
              .map(v => v.selectedValue)
              .join(' / ');
          }
        }
      }
    }
    // If variation combinations is not provided, don't modify existing combinations

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Update QR code if name, SKU, or price changed
    if (req.body.name || req.body.sku || req.body.sellingPrice) {
      const updateQrCodeData = JSON.stringify({
        id: product._id,
        name: product.name,
        sku: product.sku,
        price: product.sellingPrice
      });
      
      product.qrCode = await QRCode.toDataURL(updateQrCodeData);
      await product.save();
    }

    // Update category product counts if category changed
    if (oldProduct.category !== product.category) {
      const oldCategory = await Category.findOne({ name: oldProduct.category });
      const newCategory = await Category.findOne({ name: product.category });
      
      if (oldCategory) await oldCategory.updateProductCount();
      if (newCategory) await newCategory.updateProductCount();
    }
    
    // Sync to WooCommerce (async, non-blocking)
    syncProductToWooCommerce(product).catch(err => {
      console.error('Failed to sync product to WooCommerce:', err);
      // Don't fail the request if sync fails
    });
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    console.error('Request body:', req.body);
    console.error('Product ID:', req.params.id);
    
    // Provide more specific error messages
    if (error.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + error.message
      });
    }
    
    if (error.message.includes('Cannot read properties of undefined')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data structure provided. Please check your variation data.',
        debug: {
          originalError: error.message,
          requestBody: req.body
        }
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while updating the product',
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        requestBody: req.body
      } : undefined
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product image from Cloudinary
    if (product.image) {
      try {
        const publicId = getPublicIdFromUrl(product.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting product image from Cloudinary:', error);
      }
    }

    // Delete variation value images from Cloudinary
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        if (variation.selectedValues && variation.selectedValues.length > 0) {
          for (const selectedValue of variation.selectedValues) {
            if (selectedValue.image) {
              try {
                const publicId = getPublicIdFromUrl(selectedValue.image);
                if (publicId) {
                  await deleteFromCloudinary(publicId);
                }
              } catch (error) {
                console.error('Error deleting variation value image from Cloudinary:', error);
              }
            }
          }
        }
      }
    }

    // Delete variation combination images from Cloudinary
    if (product.variationCombinations && product.variationCombinations.length > 0) {
      for (const combination of product.variationCombinations) {
        if (combination.image) {
          try {
            const publicId = getPublicIdFromUrl(combination.image);
            if (publicId) {
              await deleteFromCloudinary(publicId);
            }
          } catch (error) {
            console.error('Error deleting variation combination image from Cloudinary:', error);
          }
        }
      }
    }

    // Delete from WooCommerce first (before deleting from POS)
    if (product.sku) {
      await deleteProductFromWooCommerce(product.sku).catch(err => {
        console.error('Failed to delete product from WooCommerce:', err);
        // Continue with deletion even if WooCommerce sync fails
      });
    }

    // Delete the product
    await Product.findByIdAndDelete(req.params.id);

    // Update category product count
    const category = await Category.findOne({ name: product.category });
    if (category) {
      await category.updateProductCount();
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.json({
        success: true,
        products: []
      });
    }
    
    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { sku: { $regex: query, $options: 'i' } },
            { barcodeId: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).limit(10);
    
    res.json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // First try to find the product by main barcode
    let product = await Product.findOne({
      barcodeId: barcode,
      isActive: true
    });
    
    let selectedCombination = null;
    
    // If not found, try to find by variation combination barcode
    if (!product) {
      product = await Product.findOne({
        'variationCombinations.barcodeId': barcode,
        'variationCombinations.isActive': true
      });
      
      if (product) {
        selectedCombination = product.variationCombinations.find(
          combo => combo.barcodeId === barcode && combo.isActive
        );
      }
    }
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product: {
        ...product.toObject(),
        selectedCombination
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name');
    
    res.json({
      success: true,
      categories: categories.map(cat => cat.name)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { products } = req.body;
    
    const updatePromises = products.map(({ id, quantity }) => {
      return Product.findByIdAndUpdate(
        id,
        { $inc: { stock: -quantity } },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete old image from Cloudinary if exists
    if (product.image) {
      try {
        const publicId = getPublicIdFromUrl(product.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting old image from Cloudinary:', error);
      }
    }
    
    // Set new image
    product.image = req.file.path;
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image: req.file.path,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (!product.image) {
      return res.status(400).json({
        success: false,
        message: 'No image to delete'
      });
    }
    
    // Delete from Cloudinary
    try {
      const publicId = getPublicIdFromUrl(product.image);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
    
    // Remove image from product
    product.image = undefined;
    await product.save();
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete old image from Cloudinary if exists
    if (product.image) {
      try {
        const publicId = getPublicIdFromUrl(product.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting old image from Cloudinary:', error);
      }
    }
    
    // Update with new image URL
    product.image = req.file.path;
    await product.save();
    
    res.json({
      success: true,
      message: 'Image updated successfully',
      imageUrl: req.file.path,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadVariationCombinationImage = async (req, res) => {
  try {
    const { id, combinationIndex } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if variation combination exists
    if (!product.variationCombinations[combinationIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Variation combination not found'
      });
    }
    
    const combination = product.variationCombinations[combinationIndex];
    
    // Delete old image from Cloudinary if exists
    if (combination.image) {
      try {
        const publicId = getPublicIdFromUrl(combination.image);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting old image from Cloudinary:', error);
      }
    }
    
    // Set new image
    combination.image = req.file.path;
    await product.save();
    
    res.json({
      success: true,
      message: 'Variation combination image uploaded successfully',
      image: req.file.path,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateVariationCombination = async (req, res) => {
  try {
    const { id, combinationIndex } = req.params;
    const { purchasePrice, sellingPrice, stock, minStock, isActive } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if variation combination exists
    if (!product.variationCombinations[combinationIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Variation combination not found'
      });
    }
    
    const combination = product.variationCombinations[combinationIndex];
    
    // Update combination fields
    if (purchasePrice !== undefined) combination.purchasePrice = purchasePrice;
    if (sellingPrice !== undefined) combination.sellingPrice = sellingPrice;
    if (stock !== undefined) combination.stock = stock;
    if (minStock !== undefined) combination.minStock = minStock;
    if (isActive !== undefined) combination.isActive = isActive;
    
    // Regenerate QR code if price changed
    if (sellingPrice !== undefined) {
      const combinationQRData = JSON.stringify({
        productId: product._id,
        combinationSku: combination.sku,
        name: `${product.name} - ${combination.combinationName}`,
        price: combination.sellingPrice
      });
      
      combination.qrCode = await QRCode.toDataURL(combinationQRData);
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Variation combination updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getActiveVariations = async (req, res) => {
  try {
    const variations = await ProductVariation.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name description type isRequired values');
    
    res.json({
      success: true,
      variations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};