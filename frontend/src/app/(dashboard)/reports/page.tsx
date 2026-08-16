"use client";

import { RotationChart } from "@/components/reports/RotationChart";
import { LowStockTable } from "@/components/reports/LowStockTable";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function ReportsPage() {
  const { user } = useAuth();

  if (user?.role === 'CAJERO') {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-warning-text mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Denegado</h2>
        <p className="text-gray-500 mt-2">No tienes los permisos necesarios para ver reportes analíticos.</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Analíticas</h1>
        <p className="text-gray-500 mt-1">
          Visualiza la rotación de productos y el estado crítico del inventario.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[400px]">
          <RotationChart />
        </div>
        
        <div className="h-[400px] lg:h-auto">
          <LowStockTable />
        </div>
      </div>
    </div>
  );
}
