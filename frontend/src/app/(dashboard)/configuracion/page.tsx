"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BranchFormModal } from "@/components/config/BranchFormModal";
import { UserFormModal } from "@/components/config/UserFormModal";
import { RoleFormModal } from "@/components/config/RoleFormModal";
import { AlertCircle, Edit, Store, Users, ShieldCheck } from "lucide-react";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ConfigPage() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'roles'>('users');

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    },
    enabled: user?.isSystem
  });

  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    }
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data;
    }
  });

  if (!hasPermission('users.manage') && !hasPermission('branches.manage') && !hasPermission('roles.manage')) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-warning-text mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
        <p className="text-gray-500 mt-2">No tienes permisos para acceder a la configuración del sistema.</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--pos-brutal-fg)]">Configuración</h1>
          <p className="text-[var(--pos-brutal-fg)] font-bold uppercase text-sm mt-1">
            Administra los usuarios del sistema y las sucursales.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 shrink-0 border-b-4 border-[var(--pos-brutal-fg)] pb-4">
        {hasPermission('users.manage') && (
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 flex items-center gap-2 font-black uppercase transition-colors border-2 rounded-none",
              activeTab === 'users' ? "border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-primary)] text-white shadow-[4px_4px_0_0_var(--pos-brutal-fg)]" : "border-transparent text-[var(--pos-brutal-fg)] hover:border-[var(--pos-brutal-fg)] hover:shadow-[4px_4px_0_0_var(--pos-brutal-fg)]"
            )}
          >
            <Users className="w-5 h-5" strokeWidth={2.5} />
            Usuarios
          </button>
        )}
        {hasPermission('branches.manage') && (
          <button
            onClick={() => setActiveTab('branches')}
            className={cn(
              "px-4 py-2 flex items-center gap-2 font-black uppercase transition-colors border-2 rounded-none",
              activeTab === 'branches' ? "border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-primary)] text-white shadow-[4px_4px_0_0_var(--pos-brutal-fg)]" : "border-transparent text-[var(--pos-brutal-fg)] hover:border-[var(--pos-brutal-fg)] hover:shadow-[4px_4px_0_0_var(--pos-brutal-fg)]"
            )}
          >
            <Store className="w-5 h-5" strokeWidth={2.5} />
            Sucursales
          </button>
        )}
        {hasPermission('roles.manage') && (
          <button
            onClick={() => setActiveTab('roles')}
            className={cn(
              "px-4 py-2 flex items-center gap-2 font-black uppercase transition-colors border-2 rounded-none",
              activeTab === 'roles' ? "border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-primary)] text-white shadow-[4px_4px_0_0_var(--pos-brutal-fg)]" : "border-transparent text-[var(--pos-brutal-fg)] hover:border-[var(--pos-brutal-fg)] hover:shadow-[4px_4px_0_0_var(--pos-brutal-fg)]"
            )}
          >
            <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
            Roles y Permisos
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'users' ? (
          <div className="bg-[var(--pos-brutal-panel)] rounded-none border-4 border-[var(--pos-brutal-fg)] overflow-hidden shadow-[6px_6px_0_0_var(--pos-brutal-fg)] mb-8">
            <div className="p-4 border-b-4 border-[var(--pos-brutal-fg)] flex justify-between items-center bg-[var(--pos-brutal-bg)]">
              <h2 className="font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">Directorio de Usuarios</h2>
              <UserFormModal />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-black uppercase">
                <tr>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Nombre</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Email</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Rol</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Sucursal</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {loadingUsers && <tr><td colSpan={5} className="p-4 text-center font-bold uppercase text-[var(--pos-brutal-fg)]">Cargando...</td></tr>}
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[var(--pos-brutal-accent)] transition-colors border-b-2 border-[var(--pos-brutal-fg)]">
                    <td className="px-4 py-3 font-black text-[var(--pos-brutal-fg)]">{u.name}</td>
                    <td className="px-4 py-3 font-bold text-[var(--pos-brutal-fg)]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-none border-2 border-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)]",
                        u.role?.isSystem ? "bg-[var(--pos-brutal-fg)] text-[var(--pos-brutal-panel)]" : "bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)]"
                      )}>
                        {u.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--pos-brutal-fg)]">{u.branch?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <UserFormModal user={u} trigger={
                        <button className="text-[var(--pos-brutal-fg)] hover:bg-[var(--pos-brutal-fg)] hover:text-white p-2 border-2 border-transparent hover:border-[var(--pos-brutal-fg)] rounded-none transition-colors">
                          <Edit className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'branches' ? (
          <div className="bg-[var(--pos-brutal-panel)] rounded-none border-4 border-[var(--pos-brutal-fg)] overflow-hidden shadow-[6px_6px_0_0_var(--pos-brutal-fg)] mb-8">
            <div className="p-4 border-b-4 border-[var(--pos-brutal-fg)] flex justify-between items-center bg-[var(--pos-brutal-bg)]">
              <h2 className="font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">Listado de Sucursales</h2>
              <BranchFormModal />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-black uppercase">
                <tr>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Nombre</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Dirección</th>
                  <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {loadingBranches && <tr><td colSpan={3} className="p-4 text-center font-bold uppercase text-[var(--pos-brutal-fg)]">Cargando...</td></tr>}
                {branches?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-[var(--pos-brutal-accent)] transition-colors border-b-2 border-[var(--pos-brutal-fg)]">
                    <td className="px-4 py-3 font-black text-[var(--pos-brutal-fg)]">{b.name}</td>
                    <td className="px-4 py-3 font-bold text-[var(--pos-brutal-fg)]">{b.address || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <BranchFormModal branch={b} trigger={
                        <button className="text-[var(--pos-brutal-fg)] hover:bg-[var(--pos-brutal-fg)] hover:text-white p-2 border-2 border-transparent hover:border-[var(--pos-brutal-fg)] rounded-none transition-colors">
                          <Edit className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'roles' ? (
        <div className="bg-[var(--pos-brutal-panel)] rounded-none border-4 border-[var(--pos-brutal-fg)] overflow-hidden shadow-[6px_6px_0_0_var(--pos-brutal-fg)] mb-8">
          <div className="p-4 border-b-4 border-[var(--pos-brutal-fg)] flex justify-between items-center bg-[var(--pos-brutal-bg)]">
            <h2 className="font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">Roles del Sistema</h2>
            <RoleFormModal />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-black uppercase">
              <tr>
                <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Rol</th>
                <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Descripción</th>
                <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest">Permisos Activos</th>
                <th className="px-4 py-3 border-b-4 border-[var(--pos-brutal-fg)] tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {loadingRoles && <tr><td colSpan={4} className="p-4 text-center font-bold uppercase text-[var(--pos-brutal-fg)]">Cargando...</td></tr>}
              {roles?.map((r: any) => (
                <tr key={r.id} className="hover:bg-[var(--pos-brutal-accent)] transition-colors border-b-2 border-[var(--pos-brutal-fg)]">
                  <td className="px-4 py-3 font-black text-[var(--pos-brutal-fg)] flex items-center gap-2">
                    {r.name}
                    {r.isSystem && <span className="text-[10px] bg-[var(--pos-brutal-fg)] text-[var(--pos-brutal-panel)] border-2 border-[var(--pos-brutal-fg)] shadow-[2px_2px_0_0_var(--pos-brutal-fg)] px-1.5 py-0.5 rounded-none uppercase font-black">Sistema</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--pos-brutal-fg)]">{r.description || '-'}</td>
                  <td className="px-4 py-3 font-bold text-[var(--pos-brutal-fg)]">{r.permissions?.length} permisos</td>
                  <td className="px-4 py-3 text-right">
                    <RoleFormModal role={r} trigger={
                      <button className="text-[var(--pos-brutal-fg)] hover:bg-[var(--pos-brutal-fg)] hover:text-white p-2 border-2 border-transparent hover:border-[var(--pos-brutal-fg)] rounded-none transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--pos-brutal-fg)] disabled:hover:border-transparent" disabled={r.isSystem}>
                        <Edit className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                    } />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : null}
      </div>
    </div>
  );
}
