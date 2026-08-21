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
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "El nombre de la sucursal es requerido"),
  address: z.string().optional()
});

interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface BranchFormModalProps {
  branch?: Branch | null;
  trigger?: React.ReactNode;
}

export function BranchFormModal({ branch, trigger }: BranchFormModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: branch?.name || "",
      address: branch?.address || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      if (branch) {
        await api.put(`/branches/${branch.id}`, values);
      } else {
        await api.post("/branches", values);
      }
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al guardar la sucursal");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <button className="flex items-center gap-2 bg-[var(--pos-brutal-primary)] text-white border-2 border-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 rounded-none px-4 py-2 text-sm">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Nueva Sucursal
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{branch ? "Editar Sucursal" : "Crear Nueva Sucursal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-danger-text text-sm bg-danger-bg p-2 rounded">{error}</div>}
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Sucursal Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Av. Principal 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-[var(--pos-brutal-primary)] text-white border-2 border-[var(--pos-brutal-fg)] font-black uppercase shadow-[4px_4px_0_0_var(--pos-brutal-fg)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 rounded-none px-4 py-2 text-sm disabled:opacity-50 disabled:shadow-none disabled:translate-x-[4px] disabled:translate-y-[4px]"
              >
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Sucursal"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
