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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-[var(--pos-brutal-bg)] text-[var(--pos-brutal-fg)] font-sans">
      <aside 
        className={cn(
          "bg-[var(--pos-brutal-panel)] border-r-4 border-[var(--pos-brutal-fg)] flex flex-col h-full transition-[width] duration-300 ease-in-out flex-shrink-0 relative",
          isSidebarExpanded ? "w-64" : "w-[80px]"
        )}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="h-16 flex items-center px-5 overflow-hidden shrink-0 border-b-4 border-[var(--pos-brutal-fg)]">
          <div className="flex items-center gap-3">
            <PackageSearch className="w-8 h-8 text-[var(--pos-brutal-fg)] shrink-0" strokeWidth={2.5} />
            <span className={cn(
              "font-black text-[var(--pos-brutal-fg)] text-xl uppercase tracking-tighter whitespace-nowrap transition-all duration-300",
              !isSidebarExpanded && "opacity-0 translate-x-4"
            )}>
              INVENTARIO OS
            </span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-0 space-y-2 overflow-x-hidden">
          {(() => {
            const navItems = [
              ...(hasPermission('inventory.view') ? [{ href: '/', name: 'Inventario', icon: LayoutDashboard }] : []),
              ...(hasPermission('transfers.view') ? [{ href: '/transfers', name: 'Transferencias', icon: ArrowRightLeft }] : []),
              ...(hasPermission('reports.view') ? [{ href: '/reports', name: 'Reportes', icon: FileBarChart }] : []),
              ...((hasPermission('users.manage') || hasPermission('branches.manage') || hasPermission('roles.manage')) ? [{ href: '/configuracion', name: 'Configuración', icon: Settings2 }] : []),
            ];
            const activeIndex = navItems.findIndex(item => item.href === pathname);
            const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

            return (
              <ul className="relative flex flex-col border-2 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-bg)] p-1 mx-2">
                {/* Pastilla Magnética (Indicador Activo) - Animación Vertical */}
                {navItems.length > 0 && activeIndex >= 0 && (
                  <span
                    className="absolute left-1 right-1 rounded-none border-2 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-panel)] shadow-[3px_3px_0_0_var(--pos-brutal-fg)] transition-[top,height] duration-500 [transition-timing-function:cubic-bezier(.68,-0.4,.27,1.4)]"
                    style={{
                      top: `calc(${safeActiveIndex} * (100% - 0.5rem) / ${navItems.length} + 0.25rem)`,
                      height: `calc((100% - 0.5rem) / ${navItems.length})`,
                    }}
                  />
                )}
                {/* Ítems */}
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="relative z-10 w-full">
                      <Link
                        href={item.href}
                        className={`flex items-center w-full px-3 py-3 text-sm font-black uppercase tracking-tight transition-colors duration-150 ${
                          safeActiveIndex === index 
                            ? 'text-[var(--pos-brutal-fg)]' 
                            : 'text-[var(--pos-brutal-fg)]/60 hover:text-[var(--pos-brutal-fg)]'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                        <span className={cn("ml-3 truncate transition-all duration-300", !isSidebarExpanded && "opacity-0 translate-x-2")}>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </nav>
        
        <div className="p-3 overflow-hidden shrink-0 border-t-4 border-[var(--pos-brutal-fg)]">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--pos-brutal-panel)] bg-[var(--pos-brutal-fg)] hover:bg-black font-black uppercase tracking-tighter transition-all duration-150 rounded-none border-2 border-transparent">
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            <span className={cn("whitespace-nowrap transition-all duration-300", !isSidebarExpanded && "opacity-0 translate-x-2")}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Offset by collapsed sidebar width */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar / Brutalist */}
        <header className="h-16 bg-[var(--pos-brutal-bg)] border-b-4 border-[var(--pos-brutal-fg)] flex items-center justify-between px-8 sticky top-0 z-40 transition-all duration-200">
          <div className="flex items-center"></div>
          
          <div className="flex items-center gap-4">
            {/* Selector de Sucursal y User Profile agrupados */}
            <div className="flex items-center gap-3">
              <span className="text-[var(--pos-brutal-fg)] text-xs font-black uppercase tracking-widest hidden sm:inline">Sucursal</span>
              <select 
                className="bg-[var(--pos-brutal-panel)] border-2 border-[var(--pos-brutal-fg)] text-[var(--pos-brutal-fg)] text-sm font-black uppercase rounded-none shadow-[2px_2px_0_0_var(--pos-brutal-fg)] focus:ring-0 focus:shadow-[4px_4px_0_0_var(--pos-brutal-fg)] block px-4 py-2 outline-none transition-all duration-200"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!hasPermission('branches.manage_all')}
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
          
            {/* User Profile */}
            <div className="flex items-center gap-4 border-l-2 border-[var(--pos-brutal-fg)] pl-4">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm text-[var(--pos-brutal-fg)] font-black uppercase tracking-tighter">{user?.name}</span>
                <span className="text-[10px] text-[var(--pos-brutal-fg)] font-black uppercase">{user?.role}</span>
              </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button type="button" className="w-10 h-10 rounded-none bg-[var(--pos-brutal-panel)] border-2 border-[var(--pos-brutal-fg)] flex items-center justify-center text-[var(--pos-brutal-fg)] font-black uppercase shadow-[2px_2px_0_0_var(--pos-brutal-fg)] outline-none transition-all overflow-hidden cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0] || 'U'
                  )}
                </button>
              } />
              <DropdownMenuContent align="end" className="w-56 rounded-none shadow-[6px_6px_0_0_var(--pos-brutal-fg)] border-4 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-panel)] p-0">
                <DropdownMenuGroup className="p-2 bg-[var(--pos-brutal-bg)] border-b-2 border-[var(--pos-brutal-fg)]">
                  <DropdownMenuLabel className="font-black uppercase tracking-tighter text-[var(--pos-brutal-fg)]">Mi Cuenta</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/profile" className="cursor-pointer w-full font-bold uppercase p-3 hover:bg-[var(--pos-brutal-accent)] rounded-none">Mi Perfil</Link>} className="p-0 rounded-none border-b-2 border-[var(--pos-brutal-fg)] focus:bg-[var(--pos-brutal-accent)]" />
                <DropdownMenuItem onClick={logout} className="text-red-600 font-bold uppercase p-3 cursor-pointer focus:text-red-600 focus:bg-red-50 hover:bg-red-50 rounded-none">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </header>
        
        <div className="px-6 pb-6 pt-6 flex-1 flex flex-col">
          <main className="bg-[var(--pos-brutal-panel)] rounded-none border-4 border-[var(--pos-brutal-fg)] shadow-[6px_6px_0_0_var(--pos-brutal-fg)] flex-1 overflow-hidden">
            <div className="p-8 h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
