import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to fix the variationCombinations.sku unique index
 * 
 * This script:
 * 1. Drops the old non-sparse unique index on variationCombinations.sku
 * 2. Creates a new sparse unique index that allows multiple null values
 * 
 * Run with: node migrations/fixVariationSkuIndex.js
 */

const fixVariationSkuIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Find and drop the old index if it exists
    const oldIndexName = 'variationCombinations.sku_1';
    const oldIndex = indexes.find(idx => idx.name === oldIndexName);
    
    if (oldIndex) {
      console.log(`\n🗑️  Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('✅ Old index dropped successfully');
    } else {
      console.log(`\nℹ️  Old index ${oldIndexName} not found, skipping drop`);
    }

    // Create new sparse unique index
    console.log('\n🔨 Creating new sparse unique index...');
    await collection.createIndex(
      { 'variationCombinations.sku': 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'variationCombinations_sku_unique'
      }
    );
    console.log('✅ New sparse unique index created successfully');

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newIndex = newIndexes.find(idx => idx.name === 'variationCombinations_sku_unique');
    
    if (newIndex) {
      console.log('\n✅ Verification: New index created');
      console.log(`   Name: ${newIndex.name}`);
      console.log(`   Key: ${JSON.stringify(newIndex.key)}`);
      console.log(`   Unique: ${newIndex.unique}`);
      console.log(`   Sparse: ${newIndex.sparse}`);
    } else {
      console.log('\n⚠️  Warning: Could not verify new index creation');
    }

    // Check for products with null SKUs in variation combinations
    console.log('\n🔍 Checking for products with null SKUs in variation combinations...');
    const productsWithNullSkus = await collection.find({
      'variationCombinations.sku': null
    }).toArray();
    
    if (productsWithNullSkus.length > 0) {
      console.log(`   Found ${productsWithNullSkus.length} products with null SKUs`);
      console.log('   These should be fixed by the pre-save hook on next save');
    } else {
      console.log('   No products with null SKUs found');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Note: Products with null SKUs will be fixed automatically when saved next time');
    console.log('   The pre-save hook will generate SKUs for variation combinations');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixVariationSkuIndex();
