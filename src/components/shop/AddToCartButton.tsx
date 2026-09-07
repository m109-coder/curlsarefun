'use client';

import { useCart } from '@/context/CartContext';
import { Plus } from 'lucide-react';

interface AddToCartButtonProps {
  product: any;
  variantId: string;
}

export function AddToCartButton({ product, variantId }: AddToCartButtonProps) {
  const { addItem, setIsOpen } = useCart();

  const variant = product.variants?.edges?.find((v: any) => v.node.id === variantId)?.node;

  const handleAddToCart = () => {
    if (!variant) return;
    addItem(product, variantId, 1);
    setIsOpen(true);
  };

  if (!variant) {
    return (
      <button
        disabled
        className="w-full px-6 py-4 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
      >
        No variant available
      </button>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={!variant.availableForSale}
      className="w-full px-6 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
    >
      <Plus className="w-5 h-5" />
      <span>{variant.availableForSale ? 'Add to Cart' : 'Out of Stock'}</span>
    </button>
  );
}