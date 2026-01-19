import dotenv from 'dotenv';

// Load environment variables FIRST before importing modules that use them
dotenv.config();

import { 
  isWooCommerceSyncEnabled, 
  validateWooCommerceConfig,
  checkWordPressPluginStatus 
} from './woocommerce-sync.js';

const testConnection = async () => {
  try {
    console.log('🔍 Testing WooCommerce Connection...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. Check environment variables
    console.log('\n1️⃣  Environment Variables Check:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const config = {
      SYNC_TO_WOOCOMMERCE: process.env.SYNC_TO_WOOCOMMERCE,
      WORDPRESS_URL: process.env.WORDPRESS_URL,
      WORDPRESS_API_KEY: process.env.WORDPRESS_API_KEY
    };
    
    console.log('SYNC_TO_WOOCOMMERCE:', config.SYNC_TO_WOOCOMMERCE || '❌ NOT SET');
    console.log('WORDPRESS_URL:', config.WORDPRESS_URL || '❌ NOT SET');
    console.log('WORDPRESS_API_KEY:', 
      config.WORDPRESS_API_KEY 
        ? `✅ SET (${config.WORDPRESS_API_KEY.length} characters)` 
        : '❌ NOT SET'
    );
    
    if (config.WORDPRESS_API_KEY) {
      const masked = `${config.WORDPRESS_API_KEY.substring(0, 8)}...${config.WORDPRESS_API_KEY.substring(config.WORDPRESS_API_KEY.length - 4)}`;
      console.log('   Masked preview:', masked);
    }
    
    // 2. Validate configuration
    console.log('\n2️⃣  Configuration Validation:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const validation = validateWooCommerceConfig();
    if (validation.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration issues found:');
      validation.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // 3. Check if sync is enabled
    console.log('\n3️⃣  Sync Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const enabled = isWooCommerceSyncEnabled();
    console.log('Sync Enabled:', enabled ? '✅ YES' : '❌ NO');
    
    if (!enabled) {
      console.log('\n⚠️  Sync is not enabled. Please check your configuration.');
      process.exit(0);
    }
    
    // 4. Test WordPress connection
    console.log('\n4️⃣  WordPress Plugin Connection Test:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('Testing connection to:', process.env.WORDPRESS_URL);
    console.log('Endpoint:', `${process.env.WORDPRESS_URL}/wp-json/wc-pos-sync/v1/status`);
    console.log('Sending request...\n');
    
    const status = await checkWordPressPluginStatus();
    
    if (status.connected) {
      console.log('✅ Connection successful!');
      console.log('Status response:', JSON.stringify(status.status, null, 2));
    } else {
      console.log('❌ Connection failed!');
      console.log('Error details:', JSON.stringify(status.error, null, 2));
      
      if (status.error?.code === 'rest_forbidden' || status.error?.message?.includes('Invalid API key')) {
        console.log('\n🔑 API Key Issue Detected:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('The API key in your .env file does not match the one configured in WordPress.');
        console.log('\nTo fix this:');
        console.log('1. Go to WordPress Admin → POS Sync → Settings');
        console.log('2. Copy the API key shown there');
        console.log('3. Update WORDPRESS_API_KEY in your .env file');
        console.log('4. Make sure there are no extra spaces or quotes');
        console.log('5. Restart your server');
      } else if (status.error?.code === 'ECONNREFUSED' || status.error?.message?.includes('ENOTFOUND')) {
        console.log('\n🌐 Connection Issue Detected:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Cannot reach the WordPress server. Check:');
        console.log('1. WORDPRESS_URL is correct');
        console.log('2. WordPress site is accessible');
        console.log('3. No firewall blocking the connection');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
};

testConnection();
