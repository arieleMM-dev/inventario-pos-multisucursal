"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "Nombre es requerido"),
  lastName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "Apellido es requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().refine(val => {
    if (!val) return true;
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val);
  }, "Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 especial").optional(),
  roleId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable()
});

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  roleName: string;
  branchId?: string | null;
}

interface UserFormModalProps {
  user?: User | null;
  trigger?: React.ReactNode;
}

export function UserFormModal({ user, trigger }: UserFormModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data;
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    mode: "onChange",
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
      roleId: user?.roleId || "",
      branchId: user?.branchId || "",
    },
  });

  const passwordValue = form.watch("password") || "";
  const hasLength = passwordValue.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue);
  const hasNumber = /\d/.test(passwordValue);
  const hasSpecial = /[@$!%*?&]/.test(passwordValue);

  const selectedRoleId = form.watch("roleId");
  const selectedRole = roles?.find((r: any) => r.id === selectedRoleId);
  const showBranchSelect = !selectedRole?.isSystem;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      const payload = { ...values };
      if (!payload.roleId) {
        payload.roleId = null;
      }
      if (!showBranchSelect || !payload.roleId) {
        payload.branchId = null;
      }
      
      if (user) {
        if (!payload.password) delete payload.password; // No enviar contraseña si está vacía al actualizar
        await api.put(`/users/${user.id}`, payload);
      } else {
        if (!payload.password) {
           form.setError("password", { message: "Requerido para nuevos usuarios" });
           return;
        }
        await api.post("/users", payload);
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al guardar el usuario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <button className="flex items-center gap-2 bg-[var(--pos-brutal-panel)] hover:bg-[var(--pos-brutal-accent)] text-[var(--pos-brutal-fg)] border-2 border-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 rounded-none px-5 py-2.5 text-sm cursor-pointer">
              <Plus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-danger-text text-sm bg-danger-bg p-2 rounded">{error}</div>}
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Datos Base</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ariel Esteban" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Morillo Mosquera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña {user ? "(Dejar en blanco para mantener actual)" : ""}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    {(!user || passwordValue) && (
                      <div className="text-xs space-y-1 mt-2 text-gray-500">
                        <div className="flex items-center gap-1">
                          {hasLength ? <span className="text-green-500">✅</span> : <span>❌</span>} Mínimo 8 caracteres
                        </div>
                        <div className="flex items-center gap-1">
                          {hasUpper ? <span className="text-green-500">✅</span> : <span>❌</span>} Al menos una mayúscula
                        </div>
                        <div className="flex items-center gap-1">
                          {hasNumber ? <span className="text-green-500">✅</span> : <span>❌</span>} Al menos un número
                        </div>
                        <div className="flex items-center gap-1">
                          {hasSpecial ? <span className="text-green-500">✅</span> : <span>❌</span>} Al menos un carácter especial (@$!%*?&)
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4 pt-2">
              <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Perfil Operativo</h3>
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol (Opcional)</FormLabel>
                    <FormControl>
                      <select 
                        {...field} 
                        value={field.value || ""}
                        className="flex h-10 w-full items-center justify-between rounded-none border-2 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-panel)] shadow-[4px_4px_0_0_var(--pos-brutal-fg)] px-3 py-2 font-bold text-[var(--pos-brutal-fg)] placeholder:text-[var(--pos-brutal-fg)]/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Ninguno (Sin Rol)</option>
                        {roles?.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showBranchSelect && form.watch("roleId") && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sucursal Asignada</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          value={field.value || ""}
                          className="flex h-10 w-full items-center justify-between rounded-none border-2 border-[var(--pos-brutal-fg)] bg-[var(--pos-brutal-panel)] shadow-[4px_4px_0_0_var(--pos-brutal-fg)] px-3 py-2 font-bold text-[var(--pos-brutal-fg)] placeholder:text-[var(--pos-brutal-fg)]/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Seleccione una sucursal</option>
                          {branches?.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-[var(--pos-brutal-panel)] hover:bg-[var(--pos-brutal-accent)] text-[var(--pos-brutal-fg)] border-2 border-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 rounded-none px-6 py-2.5 text-sm cursor-pointer disabled:opacity-50"
              >
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Usuario"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
