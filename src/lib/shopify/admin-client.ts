const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

interface ShopifyOrder {
  id: string;
  name: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Low-level GraphQL caller for the Shopify Admin API.
 *
 * @param query - GraphQL query/mutation string.
 * @param variables - Optional variables map.
 * @throws When the token is missing, the HTTP call fails, or Shopify returns
 *   `errors` in the GraphQL payload (e.g. missing scopes like `read_orders`).
 */
export async function shopifyAdminRequest(query: string, variables?: Record<string, any>) {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not configured');
  }

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify Admin API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

export const GET_ORDERS_QUERY = `
  query GetOrders($first: Int!) {
    orders(first: $first) {
      edges {
        node {
          id
          name
          createdAt
          cancelledAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                quantity
                originalTotalSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                variant {
                  id
                  sku
                }
              }
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
 * Lists orders via the **REST** endpoint `/orders.json?status=any`.
 *
 * @remarks
 * We use REST instead of GraphQL on purpose: GraphQL fields that expose
 * customer PII require additional protected-customer-data access, which a
 * private token may not have. `status=any` is required, otherwise Shopify only
 * returns `open` orders and historical orders (e.g. `#1001`) disappear.
 *
 * @param limit - Max orders to fetch (Shopify default page size is 50).
 * @returns Array of REST order objects.
 * @throws Re-throws the error including the HTTP status and response body so
 *   the admin UI can surface it instead of rendering an empty table.
 */
export async function getShopifyOrders(limit: number = 50): Promise<any[]> {
  try {
    if (!SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
      throw new Error('Shopify admin credentials are not configured');
    }

    const params = new URLSearchParams({
      status: 'any',
      limit: String(limit),
    });

    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify orders fetch failed: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to fetch Shopify orders:', error);
    throw error;
  }
}

export const GET_ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      cancelledAt
      closedAt
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalShippingPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      lineItems(first: 50) {
        edges {
          node {
            id
            name
            quantity
            originalTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            variant {
              id
              sku
            }
          }
        }
      }
      fulfillments {
        id
        status
        trackingInfo {
          number
          company
        }
      }
    }
  }
`;

export async function getShopifyOrderById(id: string) {
  try {
    const data = await shopifyAdminRequest(GET_ORDER_QUERY, { id });
    return data?.order || null;
  } catch (error) {
    console.error('Failed to fetch Shopify order:', error);
    throw error;
  }
}

/**
 * Creates a **real** Shopify order via `POST /orders.json`.
 *
 * Payload contract (enforced by the webhook caller):
 *  - Product lines: `{ variant_id, quantity }` — never send `price`; Shopify
 *    resolves the catalog price.
 *  - Custom service lines: `{ title, price, quantity }` — never send
 *    `variant_id`; appointment metadata travels in `properties`.
 *  - `financial_status` may be `paid` or `partially_paid`. Note that the REST
 *    endpoint can reject `partially_paid` unless a matching `transactions`
 *    array is present — the caller falls back to a Draft Order in that case.
 *
 * Every request logs the exact URL and payload; every failure logs the full
 * Shopify response body so rejected fields are diagnosable from server logs.
 *
 * @param orderData - Order body without the `{ order: ... }` wrapper.
 * @returns The created order object.
 * @throws Error containing status, statusText and the full response body.
 * @requires `write_orders` scope on `SHOPIFY_ADMIN_ACCESS_TOKEN`.
 */
export async function createShopifyOrder(orderData: any) {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    throw new Error('Shopify admin credentials are not configured');
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;
  const payload = JSON.stringify({ order: orderData });

  console.log('[Shopify] Creating order:', url);
  console.log('[Shopify] Order payload:', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: payload,
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      const json = await response.json();
      errorBody = JSON.stringify(json, null, 2);
    } catch {
      errorBody = await response.text();
    }
    const error = new Error(`Shopify order creation failed: ${response.status} ${response.statusText}\n${errorBody}`);
    console.error('[Shopify] Order creation error:', error);
    throw error;
  }

  const data = await response.json();
  console.log('[Shopify] Order created:', data.order?.id, data.order?.name);
  return data.order;
}

/**
 * Creates a **draft order** via `POST /draft_orders.json`.
 *
 * @remarks
 * Used as the fallback when `createShopifyOrder` fails — typically when the
 * order mixes physical variants with custom service lines or when the payment
 * is partial and Shopify requires transaction records. The draft keeps the
 * sale visible in Shopify Admin so staff can collect the remaining balance.
 *
 * @param draftOrderData - Draft order body without the `{ draft_order: ... }`
 *   wrapper.
 * @returns The created draft order object.
 * @throws Error containing status, statusText and the full response body.
 * @requires `write_draft_orders` scope on `SHOPIFY_ADMIN_ACCESS_TOKEN`.
 */
export async function createShopifyDraftOrder(draftOrderData: any) {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    throw new Error('Shopify admin credentials are not configured');
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json`;
  const payload = JSON.stringify({ draft_order: draftOrderData });

  console.log('[Shopify] Creating draft order:', url);
  console.log('[Shopify] Draft order payload:', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: payload,
  });

  if (!response.ok) {
    let errorBody = '';
    try {
      const json = await response.json();
      errorBody = JSON.stringify(json, null, 2);
    } catch {
      errorBody = await response.text();
    }
    const error = new Error(`Shopify draft order creation failed: ${response.status} ${response.statusText}\n${errorBody}`);
    console.error('[Shopify] Draft order creation error:', error);
    throw error;
  }

  const data = await response.json();
  console.log('[Shopify] Draft order created:', data.draft_order?.id);
  return data.draft_order;
}

export async function getShopifyRevenue(orders: any[]): Promise<number> {
  return orders.reduce((total, order) => {
    if (order.totalPriceSet?.shopMoney?.amount) {
      return total + parseFloat(order.totalPriceSet.shopMoney.amount);
    }
    if (order.total_price) {
      return total + parseFloat(order.total_price);
    }
    return total;
  }, 0);
}