"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';

export function TopBar() {
  const { user, selectedBranchId, setSelectedBranchId, logout } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // Fetch branches if user can select them
    if (user?.role === 'ADMIN') {
      api.get('/branches').then(({ data }) => setBranches(data.data)).catch(console.error);
    } else if (user?.branchId) {
      // Si el usuario tiene una sola sucursal asignada (cajero o encargado)
      // podríamos no requerir fetch o podemos buscar la información.
      api.get('/branches').then(({ data }) => setBranches(data.data.filter((b: any) => b.id === user.branchId))).catch(console.error);
    }
  }, [user]);

  const canGoBack = user?.role === 'ADMIN' || user?.role === 'ENCARGADO';

  return (
    <div className="h-16 bg-[var(--pos-brutal-bg)] border-b-4 border-[var(--pos-brutal-fg)] flex items-center justify-between px-4 sm:px-6 z-10">
      <div className="flex items-center space-x-4">
        {canGoBack && (
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-[var(--pos-brutal-fg)] font-black uppercase tracking-tighter hover:bg-[var(--pos-brutal-fg)] hover:text-[var(--pos-brutal-panel)] px-3 py-1.5 transition-colors mr-2 border-2 border-[var(--pos-brutal-fg)] rounded-none shadow-[2px_2px_0_0_var(--pos-brutal-fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <ArrowLeft size={20} strokeWidth={2.5} className="mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        )}
        
        <div className="flex items-center">
          <span className="text-[var(--pos-brutal-fg)] mr-2 font-black uppercase tracking-tighter hidden sm:inline">Sucursal:</span>
          {user?.role === 'ADMIN' ? (
            <select 
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-[var(--pos-brutal-panel)] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] font-black uppercase rounded-none py-1.5 px-3 focus:outline-none focus:shadow-[4px_4px_0_0_var(--pos-brutal-fg)] transition-shadow shadow-[2px_2px_0_0_var(--pos-brutal-fg)]"
            >
              <option value="" disabled>Seleccione...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <span className="font-black text-[var(--pos-brutal-fg)] uppercase px-3 py-1.5 border-2 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-panel)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]">
              {branches.find(b => b.id === selectedBranchId)?.name || 'Cargando...'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">{user?.name}</div>
          <div className="text-[10px] text-[var(--pos-brutal-fg)] font-black uppercase">{user?.role}</div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-[var(--pos-brutal-panel)] bg-[var(--pos-brutal-fg)] hover:bg-black transition-colors border-2 border-transparent rounded-none"
          title="Cerrar sesión"
        >
          <LogOut size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
