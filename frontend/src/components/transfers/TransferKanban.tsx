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
  PENDIENTE: 'bg-[#FFDE59] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]',
  EN_TRANSITO: 'bg-[#38BDF8] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]',
  RECIBIDO: 'bg-[#4ADE80] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]',
  CANCELADO: 'bg-[#F87171] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]',
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
            className="flex-1 bg-[var(--pos-brutal-primary)] text-white font-black uppercase text-[10px] py-1.5 border-2 border-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-none"
          >
            Enviar
          </button>
          <button 
            onClick={() => updateStatus.mutate({ id: transfer.id, status: 'CANCELADO' })}
            className="flex-1 bg-[var(--pos-brutal-panel)] text-[var(--pos-brutal-fg)] font-black uppercase text-[10px] py-1.5 border-2 border-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-none"
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
            className="flex-1 bg-[#4ADE80] text-[var(--pos-brutal-fg)] font-black uppercase text-[10px] py-1.5 border-2 border-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-none"
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
          <div key={column.status} className="flex-1 min-w-[300px] bg-[var(--pos-brutal-panel)] rounded-none p-4 border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)]">
            <div className="flex items-center justify-between mb-4 border-b-4 border-[var(--pos-brutal-fg)] pb-2">
              <h3 className="font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter flex items-center gap-2">
                {statusIcons[column.status]}
                {column.title}
              </h3>
              <span className="bg-[var(--pos-brutal-fg)] text-[var(--pos-brutal-panel)] text-xs py-0.5 px-2 rounded-none font-black shadow-[2px_2px_0_0_var(--pos-brutal-fg)]">
                {columnTransfers.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTransfers.map(transfer => (
                <div key={transfer.id} className="bg-[var(--pos-brutal-bg)] p-4 rounded-none border-2 border-[var(--pos-brutal-fg)] shadow-[4px_4px_0_0_var(--pos-brutal-fg)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_var(--pos-brutal-fg)] transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-[var(--pos-brutal-fg)] font-bold uppercase">
                      {format(new Date(transfer.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </div>
                    <div className={cn("text-[10px] uppercase font-black px-2 py-0.5 rounded-none", statusColors[transfer.status])}>
                      {transfer.status}
                    </div>
                  </div>
                  
                  <h4 className="font-black text-[var(--pos-brutal-fg)] mb-1 flex items-center gap-2 uppercase tracking-tighter">
                    <Package className="w-5 h-5 text-[var(--pos-brutal-fg)]" strokeWidth={2.5} />
                    {transfer.product.name}
                  </h4>
                  <div className="text-sm text-[var(--pos-brutal-fg)] mb-3 font-bold uppercase">
                    <span className="font-black text-lg">{transfer.quantity}</span> unidades
                  </div>

                  <div className="bg-[var(--pos-brutal-panel)] p-2 rounded-none border-2 border-[var(--pos-brutal-fg)] text-xs space-y-1 mb-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--pos-brutal-fg)] font-bold uppercase">Origen:</span>
                      <span className="font-black text-[var(--pos-brutal-fg)] uppercase truncate max-w-[120px]">{transfer.originBranch.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--pos-brutal-fg)] font-bold uppercase">Destino:</span>
                      <span className="font-black text-[var(--pos-brutal-primary)] uppercase truncate max-w-[120px]">{transfer.destinationBranch.name}</span>
                    </div>
                  </div>

                  {handleAction(transfer)}
                </div>
              ))}

              {columnTransfers.length === 0 && (
                <div className="text-center p-6 border-4 border-dashed border-[var(--pos-brutal-fg)] rounded-none text-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)]">
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
