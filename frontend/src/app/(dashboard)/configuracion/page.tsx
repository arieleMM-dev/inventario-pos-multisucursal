"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BranchFormModal } from "@/components/config/BranchFormModal";
import { UserFormModal } from "@/components/config/UserFormModal";
import { AlertCircle, Edit, Store, Users } from "lucide-react";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ConfigPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'branches'>('users');

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    },
    enabled: user?.role === 'ADMIN'
  });

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    }
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-warning-text mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
        <p className="text-gray-500 mt-2">Solo los administradores pueden acceder a la configuración del sistema.</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">
            Administra los usuarios del sistema y las sucursales.
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2",
            activeTab === 'users' ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={cn(
            "pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2",
            activeTab === 'branches' ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Store className="w-4 h-4" />
          Sucursales
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'users' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Directorio de Usuarios</h2>
              <UserFormModal />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Nombre</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Email</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Rol</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Sucursal</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingUsers && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Cargando...</td></tr>}
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-1 rounded-full",
                        u.role === 'ADMIN' ? "bg-purple-100 text-purple-700" :
                        u.role === 'ENCARGADO' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <UserFormModal user={u} trigger={
                        <button className="text-gray-400 hover:text-brand-600 p-1 rounded-md transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Listado de Sucursales</h2>
              <BranchFormModal />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Nombre</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200">Dirección</th>
                  <th className="px-4 py-3 font-medium border-b border-gray-200 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingBranches && <tr><td colSpan={3} className="p-4 text-center text-gray-500">Cargando...</td></tr>}
                {branches?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.address || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <BranchFormModal branch={b} trigger={
                        <button className="text-gray-400 hover:text-brand-600 p-1 rounded-md transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
