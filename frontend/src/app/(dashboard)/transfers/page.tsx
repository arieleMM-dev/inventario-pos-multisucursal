"use client";

import { TransferKanban } from "@/components/transfers/TransferKanban";

export default function TransfersPage() {
  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferencias</h1>
          <p className="text-gray-500 mt-1">
            Gestiona el movimiento de inventario entre sucursales.
          </p>
        </div>
        <button className="bg-brand-500 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-brand-600 transition-colors shadow-sm">
          + Nueva Transferencia
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden min-h-0">
        <TransferKanban />
      </div>
    </div>
  );
}
