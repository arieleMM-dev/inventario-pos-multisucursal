"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Store, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function CashSessionGuard({ children }: { children: React.ReactNode }) {
  const { selectedBranchId, user } = useAuth();
  const queryClient = useQueryClient();
  const [initialFund, setInitialFund] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['cash-session', selectedBranchId],
    queryFn: async () => {
      const res = await api.get('/cash-sessions/current');
      return res.data.data; // Puede ser null si no hay abierta
    },
    enabled: !!selectedBranchId && !!user,
    retry: false
  });

  const openSessionMutation = useMutation({
    mutationFn: async (fund: number) => {
      const res = await api.post('/cash-sessions/open', { initialFund: fund });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-session', selectedBranchId] });
      setInitialFund('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Error al abrir caja');
    }
  });

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const fund = parseFloat(initialFund);
    if (isNaN(fund) || fund < 0) {
      setError('Ingrese un monto válido');
      return;
    }
    openSessionMutation.mutate(fund);
  };

  if (!user) return <>{children}</>;
  
  if (user.role === 'ADMIN' && !selectedBranchId) {
    return <>{children}</>; // El page principal ya muestra el mensaje de seleccionar sucursal
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-pos-bg)]">
        <p className="text-gray-500">Verificando sesión de caja...</p>
      </div>
    );
  }

  // Si hay sesión abierta, renderizar el POS normalmente
  if (session) {
    return <>{children}</>;
  }

  // Si no hay sesión, bloquear con pantalla de apertura de caja
  return (
    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-100 p-3 rounded-full text-brand-600">
            <Store className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Apertura de Caja</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Antes de comenzar a vender, debes declarar el fondo de inicio en caja.
        </p>

        <form onSubmit={handleOpen} className="space-y-4">
          {error && <div className="bg-danger-bg text-danger-text p-3 rounded text-sm text-center">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fondo Inicial (Efectivo en gaveta)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={initialFund}
                onChange={(e) => setInitialFund(e.target.value)}
                placeholder="0.00"
                className="pl-7 text-lg h-12"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={openSessionMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white h-12 rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
          >
            <Wallet className="w-5 h-5" />
            {openSessionMutation.isPending ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </form>
      </div>
    </div>
  );
}
