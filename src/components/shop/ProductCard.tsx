'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Plus, Star } from 'lucide-react';

interface ProductCardProps {
  product: any;
}

/**
 * Shopify product card linking to the product detail page.
 *
 * Shows image, price (with compare-at strikethrough on sale), a static
 * rating badge, and a hover "quick add" button that adds the first variant
 * to the cart.
 *
 * @param product - Shopify product node (Storefront API shape).
 */
export function ProductCard({ product }: ProductCardProps) {
  const { addItem, setIsOpen } = useCart();
  
  const image = product.images?.edges?.[0]?.node;
  const variant = product.variants?.edges?.[0]?.node;
  const price = variant ? parseFloat(variant.price.amount) : 0;
  const compareAtPrice = variant?.compareAtPrice 
    ? parseFloat(variant.compareAtPrice.amount) 
    : null;
  const isOnSale = compareAtPrice && compareAtPrice > price;

  /** Adds the first variant to the cart without navigating away. */
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (variant) {
      addItem(product, variant.id, 1);
    }
  };

  return (
    <Link href={`/products/${product.handle}`} className="group">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        
        {isOnSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Sale
          </span>
        )}

        <button
          onClick={handleQuickAdd}
          className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
          aria-label="Quick add to cart"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">
              ${price.toFixed(2)}
            </span>
            {isOnSale && (
              <span className="text-sm text-gray-500 line-through">
                ${compareAtPrice?.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">4.9</span>
          </div>
        </div>

        {!product.availableForSale && (
          <p className="text-sm text-red-600 mt-1">Out of stock</p>
        )}
      </div>
    </Link>
  );
}