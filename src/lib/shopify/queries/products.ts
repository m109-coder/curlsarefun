import { shopifyRequest } from '../client';
import { ShopifyProduct } from '@/types';

/**
 * Storefront API query for the product catalog listing. Fetches only the
 * first image and first variant per product — enough for grid/card rendering.
 */
export const GET_ALL_PRODUCTS_QUERY = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          vendor
          tags
          availableForSale
          createdAt
          updatedAt
          images(first: 1) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Fetches a page of products from the Shopify Storefront API.
 *
 * @param first - Page size (max allowed by Shopify is 250).
 * @param after - Cursor from `pageInfo.endCursor` of the previous page.
 * @returns Raw `products` connection (`edges` + `pageInfo`).
 */
export async function getAllProducts(first: number = 20, after?: string): Promise<any> {
  return await shopifyRequest(GET_ALL_PRODUCTS_QUERY, { first, after });
}

/**
 * Storefront API query for a single product detail page. Pulls up to 5
 * images and 10 variants (with `selectedOptions` for the variant picker).
 */
export const GET_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      productType
      vendor
      tags
      availableForSale
      createdAt
      updatedAt
      images(first: 5) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

/**
 * Fetches a single product by its URL handle (e.g. `/products/{handle}`).
 *
 * @param handle - Shopify product handle from the route slug.
 * @returns `productByHandle` result, or `null` when the handle doesn't exist.
 */
export async function getProductByHandle(handle: string): Promise<any> {
  return await shopifyRequest(GET_PRODUCT_BY_HANDLE_QUERY, { handle });
}