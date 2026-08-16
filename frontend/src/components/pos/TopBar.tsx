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
    <div className="h-16 bg-white border-b border-[var(--color-gray-200)] flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
      <div className="flex items-center space-x-4">
        {canGoBack && (
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-[var(--color-gray-500)] hover:text-[var(--color-brand-500)] transition-colors mr-2"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span className="font-medium hidden sm:inline">Dashboard</span>
          </button>
        )}
        
        <div className="flex items-center">
          <span className="text-[var(--color-gray-500)] mr-2 font-medium">Sucursal:</span>
          {user?.role === 'ADMIN' ? (
            <select 
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-[var(--color-gray-50)] border border-[var(--color-gray-300)] text-[var(--color-gray-900)] rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="" disabled>Seleccione...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-[var(--color-gray-900)]">
              {branches.find(b => b.id === selectedBranchId)?.name || 'Cargando...'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-[var(--color-gray-900)]">{user?.name}</div>
          <div className="text-xs text-[var(--color-gray-500)]">{user?.role}</div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-[var(--color-gray-500)] hover:text-[var(--color-danger-text)] transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
