"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TransferStatus = 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDO' | 'CANCELADO';

interface Transfer {
  id: string;
  productId: string;
  originBranchId: string;
  destinationBranchId: string;
  quantity: number;
  status: TransferStatus;
  createdAt: string;
  product: { name: string; sku: string };
  originBranch: { name: string };
  destinationBranch: { name: string };
}

const statusColors = {
  PENDIENTE: 'bg-yellow-100 border-yellow-200 text-yellow-800',
  EN_TRANSITO: 'bg-blue-100 border-blue-200 text-blue-800',
  RECIBIDO: 'bg-green-100 border-green-200 text-green-800',
  CANCELADO: 'bg-red-100 border-red-200 text-red-800',
};

const statusIcons = {
  PENDIENTE: <Clock className="w-4 h-4" />,
  EN_TRANSITO: <ArrowRight className="w-4 h-4" />,
  RECIBIDO: <CheckCircle2 className="w-4 h-4" />,
  CANCELADO: <XCircle className="w-4 h-4" />,
};

export function TransferKanban() {
  const { selectedBranchId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transfers, isLoading } = useQuery<Transfer[]>({
    queryKey: ['transfers', selectedBranchId],
    queryFn: async () => {
      const url = selectedBranchId ? `/transfers?branchId=${selectedBranchId}` : '/transfers';
      const res = await api.get(url);
      return res.data.data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TransferStatus }) => {
      const res = await api.patch(`/transfers/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers', selectedBranchId] });
      // También invalidamos productos por si el stock cambió
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando transferencias...</div>;
  }

  const columns: { title: string; status: TransferStatus }[] = [
    { title: 'Pendientes', status: 'PENDIENTE' },
    { title: 'En Tránsito', status: 'EN_TRANSITO' },
    { title: 'Completadas', status: 'RECIBIDO' },
  ];

  const handleAction = (transfer: Transfer) => {
    // Definir qué acciones puede hacer según su rol y ubicación
    const isOrigin = selectedBranchId === transfer.originBranchId;
    const isDest = selectedBranchId === transfer.destinationBranchId;
    const isAdmin = user?.role === 'ADMIN';

    if (transfer.status === 'PENDIENTE' && (isOrigin || isAdmin)) {
      return (
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => updateStatus.mutate({ id: transfer.id, status: 'EN_TRANSITO' })}
            className="flex-1 bg-brand-500 text-white text-xs py-1.5 rounded hover:bg-brand-600 transition-colors"
          >
            Enviar
          </button>
          <button 
            onClick={() => updateStatus.mutate({ id: transfer.id, status: 'CANCELADO' })}
            className="flex-1 bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      );
    }

    if (transfer.status === 'EN_TRANSITO' && (isDest || isAdmin)) {
      return (
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => updateStatus.mutate({ id: transfer.id, status: 'RECIBIDO' })}
            className="flex-1 bg-success-text text-white text-xs py-1.5 rounded hover:bg-green-600 transition-colors"
          >
            Recibir
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      {columns.map(column => {
        const columnTransfers = transfers?.filter(t => t.status === column.status) || [];
        
        return (
          <div key={column.status} className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                {statusIcons[column.status]}
                {column.title}
              </h3>
              <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
                {columnTransfers.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTransfers.map(transfer => (
                <div key={transfer.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500 font-medium">
                      {format(new Date(transfer.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </div>
                    <div className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border", statusColors[transfer.status])}>
                      {transfer.status}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    {transfer.product.name}
                  </h4>
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium text-gray-900">{transfer.quantity}</span> unidades
                  </div>

                  <div className="bg-gray-50 p-2 rounded text-xs space-y-1 mb-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Origen:</span>
                      <span className="font-medium text-gray-900 truncate max-w-[120px]">{transfer.originBranch.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Destino:</span>
                      <span className="font-medium text-brand-600 truncate max-w-[120px]">{transfer.destinationBranch.name}</span>
                    </div>
                  </div>

                  {handleAction(transfer)}
                </div>
              ))}

              {columnTransfers.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                  No hay transferencias
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
