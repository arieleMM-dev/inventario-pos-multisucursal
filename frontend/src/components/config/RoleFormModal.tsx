"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "Debe seleccionar al menos un permiso"),
});

export function RoleFormModal({ role, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: allPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/roles/permissions');
      return res.data.data;
    }
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions?.map((p: any) => p.permissionId) || [],
    },
  });

  // Reset form when opened with new role data
  useEffect(() => {
    if (open) {
      form.reset({
        name: role?.name || "",
        description: role?.description || "",
        permissions: role?.permissions?.map((p: any) => p.permissionId) || [],
      });
      setError(null);
      setActiveTab('permissions');
      if (role && allUsers) {
        const assigned = allUsers.filter((u: any) => u.roleId === role.id).map((u: any) => u.id);
        setSelectedUserIds(assigned);
      } else {
        setSelectedUserIds([]);
      }
    }
  }, [open, role, form, allUsers]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      if (role) {
        await api.put(`/roles/${role.id}`, values);
        if (activeTab === 'users' || selectedUserIds.length > 0) {
           await api.post(`/roles/${role.id}/assign`, { userIds: selectedUserIds });
        }
      } else {
        await api.post("/roles", values);
      }
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al guardar el rol");
    }
  };

  // Agrupar permisos por módulo
  const groupedPermissions = allPermissions?.reduce((acc: any, p: any) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Nuevo Rol
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-500" />
            {role ? "Editar Rol" : "Crear Nuevo Rol"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && <div className="text-danger-text text-sm bg-danger-bg p-2 rounded">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
                    <FormLabel>Nombre del Rol</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. SUPERVISOR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input placeholder="Supervisa ventas e inventario..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {role && (
              <div className="flex gap-4 border-b border-gray-200 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={cn(
                    "pb-2 px-1 text-sm font-medium transition-colors border-b-2",
                    activeTab === 'permissions' ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  Permisos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={cn(
                    "pb-2 px-1 text-sm font-medium transition-colors border-b-2",
                    activeTab === 'users' ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  Asignación de Usuarios
                </button>
              </div>
            )}

            <div className={activeTab === 'permissions' ? 'block' : 'hidden'}>
              <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Matriz de Permisos</h3>
              {permissionsLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              ) : (
                <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-4">
                      {groupedPermissions && Object.entries(groupedPermissions).map(([module, perms]: any) => (
                        <div key={module} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-brand-700">{module}</h4>
                            <div className="flex gap-2 text-xs">
                              <button
                                type="button"
                                className="text-brand-600 hover:underline"
                                onClick={() => {
                                  const modulePermIds = perms.map((p: any) => p.id);
                                  const current = field.value || [];
                                  const newValues = Array.from(new Set([...current, ...modulePermIds]));
                                  field.onChange(newValues);
                                }}
                              >
                                Seleccionar Todos
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                className="text-gray-500 hover:underline"
                                onClick={() => {
                                  const modulePermIds = perms.map((p: any) => p.id);
                                  const current = field.value || [];
                                  const newValues = current.filter((id: string) => !modulePermIds.includes(id));
                                  field.onChange(newValues);
                                }}
                              >
                                Deseleccionar Todos
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {perms.map((p: any) => (
                              <label key={p.id} className="flex items-start gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  className="mt-1 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                  checked={field.value?.includes(p.id)}
                                  onChange={(e) => {
                                    const val = e.target.checked
                                      ? [...(field.value || []), p.id]
                                      : field.value?.filter((id: string) => id !== p.id);
                                    field.onChange(val);
                                  }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{p.code}</div>
                                  <div className="text-xs text-gray-500">{p.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
            </div>

            {role && (
              <div className={activeTab === 'users' ? 'block' : 'hidden'}>
                <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Asignación Masiva</h3>
                <div className="flex items-stretch gap-4 h-[300px]">
                  {/* Usuarios sin este rol */}
                  <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-2 border-b border-gray-200 text-sm font-medium text-gray-700 text-center">
                      Usuarios Disponibles
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {allUsers?.filter((u: any) => !selectedUserIds.includes(u.id)).map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 text-sm">
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds(prev => [...prev, u.id])}
                            className="text-gray-400 hover:text-brand-600 p-1 bg-white border border-gray-200 rounded shadow-sm"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usuarios con este rol */}
                  <div className="flex-1 flex flex-col border border-brand-200 rounded-lg overflow-hidden ring-1 ring-brand-500/10">
                    <div className="bg-brand-50 p-2 border-b border-brand-200 text-sm font-medium text-brand-700 text-center">
                      Asignados a este Rol
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                      {allUsers?.filter((u: any) => selectedUserIds.includes(u.id)).map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center p-2 bg-brand-50/30 rounded border border-brand-100 text-sm">
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds(prev => prev.filter(id => id !== u.id))}
                            className="text-gray-400 hover:text-danger-text p-1 bg-white border border-gray-200 rounded shadow-sm"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <div className="text-right">
                            <div className="font-medium text-brand-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Rol"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
