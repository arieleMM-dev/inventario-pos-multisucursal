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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';

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
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border-2 border-[var(--pos-brutal-fg)] text-xs font-black uppercase bg-[var(--pos-brutal-panel)] text-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]')}>
      <span className={cn('w-2 h-2 rounded-none border border-[var(--pos-brutal-fg)]', dots[status])}></span>
      {labels[status]} {status === 'STOCK_BAJO' ? `(${stock} unid.)` : ''}
    </span>
  );
};

export function InventoryTable() {
  const { selectedBranchId } = useAuth();
  const [adjustProduct, setAdjustProduct] = useState<{ id: string, name: string, stock: number } | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string, name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading, isError } = useQuery<ProductData[]>({
    queryKey: ['products', selectedBranchId],
    queryFn: async () => {
      const res = await api.get(`/products?branchId=${selectedBranchId}`);
      return res.data.data;
    },
    enabled: !!selectedBranchId // Solo hace fetch si hay una sucursal seleccionada
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header / Actions */}
      <div className="flex items-center justify-between pb-4 border-b-4 border-[var(--pos-brutal-fg)]">
        <h2 className="text-2xl font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">Catálogo e Inventario</h2>
        <ProductFormModal />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-black uppercase">
            <tr>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">SKU</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Nombre</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Categoría</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Stock</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Mínimo</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Estado</th>
              <th className="px-4 py-3 text-xs tracking-widest border-b-4 border-[var(--pos-brutal-fg)] text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y-0">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
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
                  "group transition-colors duration-200 hover:bg-[var(--pos-brutal-accent)] cursor-default border-b-2 border-[var(--pos-brutal-fg)] rounded-none",
                  (item.status === 'STOCK_BAJO' || item.status === 'AGOTADO') && "bg-[var(--pos-brutal-accent)]"
                )}
              >
                <td className="px-4 py-4 font-black text-[var(--pos-brutal-fg)]">{item.sku}</td>
                <td className="px-4 py-4 font-bold text-[var(--pos-brutal-fg)]">{item.name}</td>
                <td className="px-4 py-4 font-bold text-[var(--pos-brutal-fg)]/70">{item.category}</td>
                <td className="px-4 py-4 font-black text-[var(--pos-brutal-fg)] text-lg">{item.stockInBranch}</td>
                <td className="px-4 py-4 font-bold text-[var(--pos-brutal-fg)]/50">{item.minStock}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={item.status} stock={item.stockInBranch} />
                </td>
                <td className="px-4 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <button type="button" className="text-[var(--pos-brutal-fg)] p-2 rounded-none hover:bg-[var(--pos-brutal-bg)] border-2 border-transparent hover:border-[var(--pos-brutal-fg)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none">
                        <MoreVertical className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setAdjustProduct({ id: item.id, name: item.name, stock: item.stockInBranch })}>
                        Ajustar Stock
                      </DropdownMenuItem>
                      <ProductFormModal 
                        product={item} 
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Editar Producto
                          </DropdownMenuItem>
                        } 
                      />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setProductToDelete({ id: item.id, name: item.name })}>
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <StockAdjustModal 
        productId={adjustProduct?.id || null}
        productName={adjustProduct?.name || ''}
        currentStock={adjustProduct?.stock || 0}
        onClose={() => setAdjustProduct(null)}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {productToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto ya no estará disponible en el inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (productToDelete) {
                  await api.delete(`/products/${productToDelete.id}`);
                  queryClient.invalidateQueries({ queryKey: ['products'] });
                  setProductToDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
