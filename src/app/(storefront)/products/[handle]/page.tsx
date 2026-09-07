import Image from 'next/image';
import { getProductByHandle } from '@/lib/shopify/queries/products';
import { AddToCartButton } from '@/components/shop/AddToCartButton';

interface ProductPageProps {
  params: { handle: string };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProductByHandle(params.handle);
  const productData = product?.productByHandle;

  if (!productData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const images = productData.images?.edges?.map((edge: any) => edge.node) || [];
  const variants = productData.variants?.edges?.map((edge: any) => edge.node) || [];
  const variant = variants[0];
  const price = variant ? parseFloat(variant.price.amount) : 0;

  return (
    <div className="bg-white min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {images.length > 0 ? (
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={images[0].url}
                  alt={images[0].altText || productData.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {productData.title}
            </h1>
            <p className="text-2xl font-semibold text-gray-900 mb-6">
              ${price.toFixed(2)}
            </p>
            <div 
              className="prose prose-sm text-gray-600 mb-8"
              dangerouslySetInnerHTML={{ __html: productData.descriptionHtml || productData.description }}
            />
            
            {variant && (
              <AddToCartButton 
                product={productData} 
                variantId={variant.id} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}