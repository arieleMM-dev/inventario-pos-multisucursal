"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function RotationChart() {
  const { selectedBranchId } = useAuth();

  const { data: rotationData, isLoading } = useQuery({
    queryKey: ['reports', 'rotation', selectedBranchId],
    queryFn: async () => {
      const url = selectedBranchId ? `/reports/rotation?branchId=${selectedBranchId}` : '/reports/rotation';
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: !!selectedBranchId
  });

  if (!selectedBranchId) {
    return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">Selecciona una sucursal para ver la rotación</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg animate-pulse">Cargando gráfica...</div>;
  }

  if (!rotationData || rotationData.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">No hay datos de ventas en los últimos 30 días</div>;
  }

  // Tomamos el top 10 para no saturar la gráfica
  const chartData = rotationData.slice(0, 10);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Rotación de Inventario (Top 10)</h3>
        <p className="text-sm text-gray-500">Unidades vendidas en los últimos 30 días</p>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip 
              cursor={{fill: '#F3F4F6'}}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="unitsSold" name="Unidades Vendidas" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
