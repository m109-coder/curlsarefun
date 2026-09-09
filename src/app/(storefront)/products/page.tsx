import { getAllProducts } from '@/lib/shopify/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';

/**
 * Product catalog page (server component).
 * Fetches all products from the Shopify Storefront API and renders them
 * as a responsive `ProductCard` grid.
 */
export default async function ProductsPage() {
  const products = await getAllProducts();
  const productList = products?.products?.edges?.map((edge: any) => edge.node) || [];

  return (
    <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Products</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Premium curly hair products for every curl type
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {productList.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {productList.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}