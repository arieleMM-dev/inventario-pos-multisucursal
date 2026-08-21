"use client";

import { TransferKanban } from "@/components/transfers/TransferKanban";

export default function TransfersPage() {
  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--pos-brutal-fg)]">Transferencias</h1>
          <p className="text-gray-500 mt-1">
            Gestiona el movimiento de inventario entre sucursales.
          </p>
        </div>
        <button className="bg-[var(--pos-brutal-primary)] text-white border-2 border-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 rounded-none px-4 py-2 text-sm">
          + Nueva Transferencia
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden min-h-0">
        <TransferKanban />
      </div>
    </div>
  );
}
