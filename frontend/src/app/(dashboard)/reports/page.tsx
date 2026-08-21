"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Building, DollarSign, AlertCircle } from "lucide-react";
import { LowStockTable } from "@/components/reports/LowStockTable";

export default function ReportsPage() {
  const { selectedBranchId, hasPermission, user } = useAuth();

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['reports-kpis', selectedBranchId],
    queryFn: async () => {
      const res = await api.get(`/reports/kpis${selectedBranchId ? `?branchId=${selectedBranchId}` : ''}`);
      return res.data.data;
    },
    enabled: hasPermission('reports.view')
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['reports-trend', selectedBranchId],
    queryFn: async () => {
      const res = await api.get(`/reports/sales-trend${selectedBranchId ? `?branchId=${selectedBranchId}` : ''}`);
      return res.data.data;
    },
    enabled: hasPermission('reports.view')
  });

  const { data: rotation, isLoading: rotationLoading } = useQuery({
    queryKey: ['reports-rotation', selectedBranchId],
    queryFn: async () => {
      const res = await api.get(`/reports/rotation${selectedBranchId ? `?branchId=${selectedBranchId}` : ''}`);
      return res.data.data;
    },
    enabled: !!selectedBranchId && hasPermission('reports.view')
  });

  if (!hasPermission('reports.view')) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-warning-text mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
        <p className="text-gray-500 mt-2">No tienes los permisos necesarios para ver reportes analíticos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[var(--pos-brutal-fg)] uppercase tracking-tighter">Dashboard y Reportes</h1>
      </div>

      {/* KPIs - Bento Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 flex flex-col justify-center gap-4 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase text-[var(--pos-brutal-fg)]/80 group-hover:text-[var(--pos-brutal-fg)] transition-colors">Usuarios Activos</p>
            <div className="w-10 h-10 bg-[var(--pos-brutal-bg)] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] rounded-none flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--pos-brutal-fg)]">
              <Users className="w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black tracking-tighter text-[var(--pos-brutal-fg)]">{kpisLoading ? '...' : kpis?.activeUsers}</p>
          </div>
        </div>

        <div className="bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 flex flex-col justify-center gap-4 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase text-[var(--pos-brutal-fg)]/80 group-hover:text-[var(--pos-brutal-fg)] transition-colors">Sucursales Activas</p>
            <div className="w-10 h-10 bg-[var(--pos-brutal-bg)] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] rounded-none flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--pos-brutal-fg)]">
              <Building className="w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black tracking-tighter text-[var(--pos-brutal-fg)]">{kpisLoading ? '...' : kpis?.totalBranches}</p>
          </div>
        </div>

        <div className="bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 flex flex-col justify-center gap-4 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase text-[var(--pos-brutal-fg)]/80 group-hover:text-[var(--pos-brutal-fg)] transition-colors">Valor de Inventario</p>
            <div className="w-10 h-10 bg-[var(--pos-brutal-bg)] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] rounded-none flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--pos-brutal-fg)]">
              <DollarSign className="w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-black tracking-tighter text-[var(--pos-brutal-fg)]">
              {kpisLoading ? '...' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis?.totalStockValue || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ventas - Ocupa 2 columnas en pantallas grandes */}
        <div className="lg:col-span-2 bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 transition-all duration-300 flex flex-col">
          <h2 className="text-xs font-black text-[var(--pos-brutal-fg)] mb-6 uppercase tracking-widest">Tendencia de Ventas (30 Días)</h2>
          <div className="h-80 w-full flex-1">
            {trendLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Cargando gráfico...</div>
            ) : trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`$${value}`, 'Ventas']}
                    labelStyle={{ color: '#475569', fontWeight: 500 }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#0891b2', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No hay datos de ventas en este periodo.</div>
            )}
          </div>
        </div>

        {/* Top Productos Vendidos */}
        <div className="bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 transition-all duration-300 flex flex-col">
          <h2 className="text-xs font-black text-[var(--pos-brutal-fg)] mb-6 uppercase tracking-widest">Top Productos</h2>
          <div className="h-80 w-full flex-1">
            {!selectedBranchId ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm text-center px-4">Seleccione una sucursal para ver la rotación.</div>
            ) : rotationLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Cargando reporte...</div>
            ) : rotation?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rotation.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="unitsSold" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={20} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No hay movimientos registrados.</div>
            )}
          </div>
        </div>
        
        {/* Productos con stock bajo - Full Width Bottom Bento */}
        <div className="lg:col-span-3 bg-[var(--pos-brutal-panel)] border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] rounded-none p-6 transition-all duration-300">
          <h2 className="text-xs font-black text-[var(--pos-brutal-fg)] mb-6 uppercase tracking-widest">Stock Crítico</h2>
          <LowStockTable />
        </div>
      </div>
    </div>
  );
}
