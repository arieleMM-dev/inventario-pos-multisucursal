"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CreditCard, Banknote, Building, UserPlus, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  onConfirm: (paymentData: any) => Promise<void>;
  isProcessing: boolean;
}

export function PaymentModal({ open, onOpenChange, subtotal, onConfirm, isProcessing }: PaymentModalProps) {
  const [method, setMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [receivedAmount, setReceivedAmount] = useState<string>(subtotal.toString());
  
  // Cliente State
  const [clientId, setClientId] = useState<string | null>(null);
  const [searchDoc, setSearchDoc] = useState('');
  
  const { selectedBranchId } = useAuth();

  const { data: currentSession } = useQuery({
    queryKey: ['cash-session', selectedBranchId],
    enabled: false // La session ya debe estar cacheada por el guard
  });
  
  const queryClient = useQueryClient();
  const session = queryClient.getQueryData(['cash-session', selectedBranchId]) as any;

  // Search Client Query
  const { data: clients, isLoading: isSearchingClient } = useQuery({
    queryKey: ['clients', searchDoc],
    queryFn: async () => {
      if (!searchDoc || searchDoc.length < 3) return [];
      const res = await api.get(`/clients?search=${searchDoc}`);
      return res.data.data;
    },
    enabled: searchDoc.length >= 3
  });

  const parsedReceived = parseFloat(receivedAmount) || 0;
  const change = Math.max(0, parsedReceived - subtotal);
  const isAmountValid = method !== 'EFECTIVO' || parsedReceived >= subtotal;

  const handleConfirm = () => {
    if (!isAmountValid) return;
    
    onConfirm({
      cashSessionId: session?.id,
      clientId,
      paymentMethod: method,
      paymentAmount: parsedReceived
    });
  };

  const selectedClient = clients?.find((c: any) => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden bg-gray-50">
        <div className="flex flex-col md:flex-row h-[500px]">
          
          {/* Left Panel: Payment Method */}
          <div className="w-full md:w-1/2 p-6 bg-white border-r border-gray-100 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Método de Pago</h2>
            
            <div className="space-y-3 flex-1">
              <button 
                onClick={() => setMethod('EFECTIVO')}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-all ${method === 'EFECTIVO' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-brand-300 bg-white'}`}
              >
                <div className={`p-2 rounded-full ${method === 'EFECTIVO' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-700">Efectivo</span>
              </button>

              <button 
                onClick={() => setMethod('TARJETA')}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-all ${method === 'TARJETA' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-brand-300 bg-white'}`}
              >
                <div className={`p-2 rounded-full ${method === 'TARJETA' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-700">Tarjeta</span>
              </button>

              <button 
                onClick={() => setMethod('TRANSFERENCIA')}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-all ${method === 'TRANSFERENCIA' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-brand-300 bg-white'}`}
              >
                <div className={`p-2 rounded-full ${method === 'TRANSFERENCIA' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Building className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-700">Transferencia</span>
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-medium text-gray-500 mb-1">Cliente (Opcional)</label>
              <div className="relative">
                <Input 
                  placeholder="Buscar DNI/Nombre..." 
                  value={searchDoc}
                  onChange={(e) => {
                     setSearchDoc(e.target.value);
                     if (clientId) setClientId(null);
                  }}
                  className="bg-gray-50"
                />
                {selectedClient && <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-3" />}
              </div>
              
              {/* Dropdown resultados */}
              {clients && clients.length > 0 && !clientId && searchDoc.length >= 3 && (
                <div className="absolute z-10 mt-1 w-[260px] bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                  {clients.map((c: any) => (
                    <div 
                      key={c.id} 
                      className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                      onClick={() => {
                        setClientId(c.id);
                        setSearchDoc(c.name);
                      }}
                    >
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.document || 'Sin documento'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Summary & Change */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6">Resumen de Cobro</h2>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Total a Pagar</span>
                <span className="text-3xl font-bold text-gray-900">${subtotal.toFixed(2)}</span>
              </div>

              {method === 'EFECTIVO' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recibido</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500 text-lg">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={subtotal}
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 text-xl font-semibold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-200/50 rounded-xl">
                    <span className="font-medium text-gray-600">Vuelto</span>
                    <span className="text-2xl font-bold text-success-text">${change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!isAmountValid || isProcessing}
              className="w-full py-4 mt-6 rounded-xl font-bold text-lg text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
            >
              {isProcessing ? 'Procesando...' : `Cobrar $${subtotal.toFixed(2)}`}
            </button>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
