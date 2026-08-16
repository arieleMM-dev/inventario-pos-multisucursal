import React from 'react';
import { Product } from '@/hooks/usePos';
import { useAuth } from '@/context/AuthContext';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const branchStock = product.stockInBranch;
  const isOutOfStock = branchStock <= 0;

  // Formatter for currency
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });

  return (
    <button
      onClick={onClick}
      disabled={isOutOfStock}
      className={`
        relative w-full h-[140px] flex flex-col items-center justify-center p-4 rounded-xl text-center
        transition-all duration-150 ease-out select-none
        ${isOutOfStock 
          ? 'bg-[var(--color-pos-card-disabled-bg)] cursor-not-allowed opacity-80' 
          : 'bg-[var(--color-pos-card-bg)] shadow-sm hover:shadow active:scale-97 cursor-pointer'
        }
        border border-[var(--color-gray-200)]
      `}
      style={{ transformOrigin: 'center center' }}
    >
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        <h3 className="pos-text-base font-medium text-[var(--color-gray-900)] line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="pos-text-sm text-[var(--color-gray-500)] mt-1">
          Stock: {branchStock}
        </p>
      </div>
      <div className="pos-text-lg font-semibold text-[var(--color-brand-500)] mt-auto pt-2">
        {formatter.format(product.price)}
      </div>

      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-xl overflow-hidden pointer-events-none">
          <div className="transform -rotate-12 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] px-8 py-1 font-bold tracking-widest uppercase border-y border-[var(--color-danger-text)] shadow-sm w-[150%] text-center">
            Agotado
          </div>
        </div>
      )}
    </button>
  );
}
