"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface LowStockItem {
  productId: string;
  name: string;
  quantity: number;
  minStock: number;
}

export function LowStockTable() {
  const { selectedBranchId } = useAuth();

  const { data: lowStockData, isLoading } = useQuery<LowStockItem[]>({
    queryKey: ['reports', 'low-stock', selectedBranchId],
    queryFn: async () => {
      const url = selectedBranchId ? `/reports/low-stock?branchId=${selectedBranchId}` : '/reports/low-stock';
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: !!selectedBranchId
  });

  if (!selectedBranchId) {
    return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">Selecciona una sucursal</div>;
  }

  return (
    <div className="bg-[var(--pos-brutal-panel)] rounded-none border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b-4 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-accent)] flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-[var(--pos-brutal-fg)]" strokeWidth={2.5} />
        <h3 className="font-black uppercase tracking-tighter text-[var(--pos-brutal-fg)]">Alerta de Stock Crítico</h3>
        {lowStockData && <span className="ml-auto bg-[var(--pos-brutal-fg)] text-[var(--pos-brutal-panel)] text-xs font-black uppercase px-2 py-0.5 rounded-none">{lowStockData.length}</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-black uppercase sticky top-0">
            <tr>
              <th className="px-4 py-3 tracking-widest border-b-4 border-[var(--pos-brutal-fg)]">Producto</th>
              <th className="px-4 py-3 tracking-widest border-b-4 border-[var(--pos-brutal-fg)] text-right">Stock</th>
              <th className="px-4 py-3 tracking-widest border-b-4 border-[var(--pos-brutal-fg)] text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody className="divide-y-0">
            {isLoading && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500 animate-pulse">Cargando...</td>
              </tr>
            )}
            {!isLoading && lowStockData?.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-success-text font-medium">
                  Todos los productos tienen stock saludable.
                </td>
              </tr>
            )}
            {!isLoading && lowStockData?.map(item => (
              <tr key={item.productId} className="hover:bg-[var(--pos-brutal-accent)] transition-colors border-b-2 border-[var(--pos-brutal-fg)]">
                <td className="px-4 py-3 font-black text-[var(--pos-brutal-fg)]">{item.name}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-black text-red-600">{item.quantity}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-[var(--pos-brutal-fg)]/50">{item.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
