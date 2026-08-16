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
import { Plus, ShieldCheck } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "Debe seleccionar al menos un permiso"),
});

export function RoleFormModal({ role, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/roles/permissions');
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
    }
  }, [open, role, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      if (role) {
        await api.put(`/roles/${role.id}`, values);
      } else {
        await api.post("/roles", values);
      }
      queryClient.invalidateQueries({ queryKey: ["roles"] });
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

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Matriz de Permisos</h3>
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-4">
                      {groupedPermissions && Object.entries(groupedPermissions).map(([module, perms]: any) => (
                        <div key={module} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-brand-700 mb-3">{module}</h4>
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
            </div>

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
