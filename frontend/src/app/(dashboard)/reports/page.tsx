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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard y Reportes</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
            <p className="text-2xl font-bold text-gray-900">{kpisLoading ? '...' : kpis?.activeUsers}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Sucursales Activas</p>
            <p className="text-2xl font-bold text-gray-900">{kpisLoading ? '...' : kpis?.totalBranches}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Valor de Inventario</p>
            <p className="text-2xl font-bold text-gray-900">
              {kpisLoading ? '...' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis?.totalStockValue || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Tendencia de Ventas (30 días)</h2>
          <div className="h-80">
            {trendLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-500">Cargando gráfico...</div>
            ) : trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`$${value}`, 'Ventas']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No hay datos de ventas en este periodo.</div>
            )}
          </div>
        </div>

        {/* Top Productos Vendidos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Productos (Más Vendidos)</h2>
          <div className="h-80">
            {!selectedBranchId ? (
              <div className="w-full h-full flex items-center justify-center text-gray-500">Seleccione una sucursal para ver la rotación.</div>
            ) : rotationLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-500">Cargando reporte...</div>
            ) : rotation?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rotation.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#374151" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="unitsSold" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No hay movimientos de venta registrados.</div>
            )}
          </div>
        </div>
        
        {/* Productos con stock bajo */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Stock Crítico</h2>
          <LowStockTable />
        </div>
      </div>
    </div>
  );
}
