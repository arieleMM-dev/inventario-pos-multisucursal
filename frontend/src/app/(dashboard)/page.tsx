import { InventoryTable } from "@/components/InventoryTable";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona el catálogo global y revisa el stock disponible en la sucursal activa.
        </p>
      </div>

      <InventoryTable />
    </div>
  );
}
