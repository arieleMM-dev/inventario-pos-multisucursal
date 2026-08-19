"use client";

import { PackageSearch, Settings, LayoutDashboard, ArrowRightLeft, FileBarChart, LogOut, Settings2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Branch {
  id: string;
  name: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, isInitializing, selectedBranchId, setSelectedBranchId, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch de sucursales para el selector (solo si está autenticado)
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
    enabled: !!token
  });

  useEffect(() => {
    if (!isInitializing && !token) {
      router.replace('/login');
    }
  }, [token, isInitializing, router]);

  if (isInitializing || !token) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-brand-500" />
            Inventario OS
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {hasPermission('inventory.view') && (
            <Link href="/" className={cn("flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors", pathname === '/' ? "text-brand-500 bg-brand-50" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")}>
              <LayoutDashboard className="w-5 h-5" />
              Inventario
            </Link>
          )}
          {hasPermission('transfers.view') && (
            <Link href="/transfers" className={cn("flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors", pathname === '/transfers' ? "text-brand-500 bg-brand-50" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")}>
              <ArrowRightLeft className="w-5 h-5" />
              Transferencias
            </Link>
          )}
          {hasPermission('reports.view') && (
            <Link href="/reports" className={cn("flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors", pathname === '/reports' ? "text-brand-500 bg-brand-50" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")}>
              <FileBarChart className="w-5 h-5" />
              Reportes
            </Link>
          )}
          {(hasPermission('users.manage') || hasPermission('branches.manage') || hasPermission('roles.manage')) && (
            <Link href="/configuracion" className={cn("flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors", pathname === '/configuracion' ? "text-brand-500 bg-brand-50" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")}>
              <Settings2 className="w-5 h-5" />
              Configuración
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-1">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors">
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Navbar / Selector de Sucursal */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Sucursal:</span>
            <select 
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2 outline-none"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!hasPermission('branches.manage_all')} // Si no tiene permiso global, no puede cambiar
            >
              {!hasPermission('branches.manage_all') ? (
                <option value={user?.branchId || ""}>Mi Sucursal ({user?.branchId})</option>
              ) : (
                <>
                  <option value="" disabled>Seleccione...</option>
                  {branches?.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mr-4">
              {user?.name} ({user?.role})
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-medium text-sm uppercase outline-none ring-2 ring-transparent focus:ring-brand-500/50 transition-all overflow-hidden cursor-pointer">
                {user?.avatar ? (
                   <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                   user?.name?.[0] || 'U'
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" className="cursor-pointer w-full">Mi Perfil</Link>} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer focus:text-red-600">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
