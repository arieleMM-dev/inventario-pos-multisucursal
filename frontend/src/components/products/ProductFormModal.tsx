"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Plus } from "lucide-react";

const formSchema = z.object({
  sku: z.string().min(3, "El SKU debe tener al menos 3 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  price: z.coerce.number().positive("El precio debe ser un número positivo"),
  minStock: z.coerce.number().int().nonnegative("Debe ser mayor o igual a 0"),
});

export function ProductFormModal({ product, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedBranchId } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: product?.sku || "",
      name: product?.name || "",
      category: product?.category || "",
      price: product?.price || 0,
      minStock: product?.minStock || 5,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        sku: product?.sku || "",
        name: product?.name || "",
        category: product?.category || "",
        price: product?.price || 0,
        minStock: product?.minStock || 5,
      });
      setError(null);
    }
  }, [open, product, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      if (product) {
        await api.put(`/products/${product.id}`, values);
      } else {
        await api.post("/products", values);
      }
      queryClient.invalidateQueries({ queryKey: ["products", selectedBranchId] });
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al guardar el producto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger ? (
          trigger
        ) : (
          <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        )
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Producto" : "Crear Nuevo Producto"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-danger-text text-sm bg-danger-bg p-2 rounded">{error}</div>}
            
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: REF-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Refresco Cola" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Bebidas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Precio ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
