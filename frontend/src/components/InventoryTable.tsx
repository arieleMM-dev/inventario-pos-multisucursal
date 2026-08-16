"use client";

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MoreVertical, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ProductFormModal } from './products/ProductFormModal';
import { StockAdjustModal } from './products/StockAdjustModal';
import { useState } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ProductStatus = 'NORMAL' | 'STOCK_BAJO' | 'AGOTADO';

interface ProductData {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  minStock: number;
  stockInBranch: number;
  status: ProductStatus;
}

const StatusBadge = ({ status, stock }: { status: ProductStatus; stock: number }) => {
  const styles = {
    NORMAL: 'bg-success-bg text-success-text',
    STOCK_BAJO: 'bg-warning-bg text-warning-text',
    AGOTADO: 'bg-danger-bg text-danger-text',
  };

  const dots = {
    NORMAL: 'bg-success-text',
    STOCK_BAJO: 'bg-warning-text',
    AGOTADO: 'bg-danger-text',
  };

  const labels = {
    NORMAL: 'Normal',
    STOCK_BAJO: 'Stock bajo',
    AGOTADO: 'Agotado',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', styles[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status])}></span>
      {labels[status]} {status === 'STOCK_BAJO' ? `(${stock} unid.)` : ''}
    </span>
  );
};

export function InventoryTable() {
  const { selectedBranchId } = useAuth();
  const [adjustProduct, setAdjustProduct] = useState<{ id: string, name: string, stock: number } | null>(null);

  const { data: products, isLoading, isError } = useQuery<ProductData[]>({
    queryKey: ['products', selectedBranchId],
    queryFn: async () => {
      const res = await api.get(`/products?branchId=${selectedBranchId}`);
      return res.data.data;
    },
    enabled: !!selectedBranchId // Solo hace fetch si hay una sucursal seleccionada
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header / Actions */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Catálogo e Inventario</h2>
        <ProductFormModal />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200">SKU</th>
              <th className="px-6 py-3 border-b border-gray-200">Nombre</th>
              <th className="px-6 py-3 border-b border-gray-200">Categoría</th>
              <th className="px-6 py-3 border-b border-gray-200">Stock</th>
              <th className="px-6 py-3 border-b border-gray-200">Mínimo</th>
              <th className="px-6 py-3 border-b border-gray-200">Estado</th>
              <th className="px-6 py-3 border-b border-gray-200 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Cargando productos...
                </td>
              </tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-danger-text">
                  Error al cargar el inventario.
                </td>
              </tr>
            )}
            {!isLoading && !isError && products?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No hay productos para mostrar en esta sucursal.
                </td>
              </tr>
            )}
            {!isLoading && !isError && products?.map((item) => (
              <tr 
                key={item.id} 
                className={cn(
                  "h-[56px] transition-colors hover:bg-gray-50",
                  (item.status === 'STOCK_BAJO' || item.status === 'AGOTADO') && "bg-warning-bg/30 hover:bg-warning-bg/40"
                )}
              >
                <td className="px-6 py-2 font-medium text-gray-900">{item.sku}</td>
                <td className="px-6 py-2">{item.name}</td>
                <td className="px-6 py-2">{item.category}</td>
                <td className="px-6 py-2 font-semibold">{item.stockInBranch}</td>
                <td className="px-6 py-2 text-gray-500">{item.minStock}</td>
                <td className="px-6 py-2">
                  <StatusBadge status={item.status} stock={item.stockInBranch} />
                </td>
                <td className="px-6 py-2 text-right">
                  <button 
                    onClick={() => setAdjustProduct({ id: item.id, name: item.name, stock: item.stockInBranch })}
                    className="text-brand-500 hover:text-brand-600 p-1 rounded-md hover:bg-brand-50 font-medium text-xs transition-colors"
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StockAdjustModal 
        productId={adjustProduct?.id || null}
        productName={adjustProduct?.name || ''}
        currentStock={adjustProduct?.stock || 0}
        onClose={() => setAdjustProduct(null)}
      />
    </div>
  );
}
