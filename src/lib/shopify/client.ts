import { GraphQLClient } from 'graphql-request';

// Get environment variables
const getEnvVars = () => {
  // Try to get from process.env first (Next.js runtime)
  let domain = process.env.SHOPIFY_STORE_DOMAIN;
  let storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  
  // Fallback to loading from .env file for scripts
  if (!domain || !storefrontAccessToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { config } = require('dotenv');
      config();
      domain = process.env.SHOPIFY_STORE_DOMAIN;
      storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    } catch (e) {
      // dotenv not available
    }
  }
  
  return { domain, storefrontAccessToken };
};

const { domain, storefrontAccessToken } = getEnvVars();
const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';

if (!domain || !storefrontAccessToken) {
  console.warn('Shopify credentials not configured. E-commerce features will be limited.');
  console.log('Domain:', domain);
  console.log('Token:', storefrontAccessToken ? 'Set' : 'Not set');
}

export const shopifyClient = domain && storefrontAccessToken 
  ? new GraphQLClient(
      `https://${domain}/api/${apiVersion}/graphql.json`,
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
          'Content-Type': 'application/json',
        },
      }
    )
  : null;

// Error handling wrapper
export async function shopifyRequest<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  if (!shopifyClient) {
    throw new Error('Shopify client not configured. Please check your environment variables.');
  }

  try {
    const response = await shopifyClient.request<T>(query, variables);
    return response;
  } catch (error) {
    console.error('Shopify API Error:', error);
    throw new Error('Failed to fetch data from Shopify');
  }
}