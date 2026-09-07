import { config } from 'dotenv';
import { getAllProducts } from '../src/lib/shopify/queries/products';

// Load environment variables from .env file
config();

async function testShopifyConnection() {
  console.log('🧪 Testing Shopify Storefront API Connection...\n');
  console.log('🔧 Environment Check:');
  console.log(`   SHOPIFY_STORE_DOMAIN: ${process.env.SHOPIFY_STORE_DOMAIN}`);
  console.log(`   SHOPIFY_STOREFRONT_ACCESS_TOKEN: ${process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? 'Set' : 'Not set'}`);
  console.log('');

  try {
    console.log('📡 Fetching products from Shopify...');
    const data = await getAllProducts(5);
    
    console.log(`✅ Connection successful!`);
    console.log(`📦 Found ${data.products.edges.length} products:\n`);
    
    data.products.edges.forEach((edge: any, index: number) => {
      const product = edge.node;
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Handle: ${product.handle}`);
      console.log(`   Price: $${product.variants.edges[0].node.price.amount}`);
      console.log(`   Available: ${product.availableForSale ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('✅ Shopify API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Shopify API test failed:', error);
    throw error;
  }
}

testShopifyConnection();