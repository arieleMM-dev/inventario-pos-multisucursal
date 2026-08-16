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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-danger-bg/30 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-danger-text" />
        <h3 className="font-semibold text-danger-text">Alerta de Stock Crítico</h3>
        {lowStockData && <span className="ml-auto bg-danger-text text-white text-xs font-bold px-2 py-0.5 rounded-full">{lowStockData.length}</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
              <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-danger-text">{item.quantity}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{item.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
