"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const formSchema = z.object({
  adjustment: z.coerce.number().int("Debe ser un número entero"),
  reason: z.string().min(1, "El motivo es requerido"),
});

interface StockAdjustModalProps {
  productId: string | null;
  productName: string;
  currentStock: number;
  onClose: () => void;
}

export function StockAdjustModal({ productId, productName, currentStock, onClose }: StockAdjustModalProps) {
  const [error, setError] = useState<string | null>(null);
  const { selectedBranchId } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      adjustment: 0,
      reason: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!productId || !selectedBranchId) return;
    
    // Validar que no resulte en stock negativo en el frontend para feedback rápido
    if (currentStock + values.adjustment < 0) {
      form.setError("adjustment", { message: "El ajuste resulta en stock negativo" });
      return;
    }

    setError(null);
    try {
      await api.post(`/products/${productId}/adjust`, {
        branchId: selectedBranchId,
        adjustment: values.adjustment,
        reason: values.reason
      });
      queryClient.invalidateQueries({ queryKey: ["products", selectedBranchId] });
      onClose();
      form.reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al ajustar el stock");
    }
  };

  return (
    <Dialog open={!!productId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Stock: {productName}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-500 mb-2">
          Stock actual: <span className="font-semibold text-gray-900">{currentStock}</span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="text-danger-text text-sm bg-danger-bg p-2 rounded">{error}</div>}
            
            <FormField
              control={form.control}
              name="adjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ajuste (+ para sumar, - para restar)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ej: 5 o -3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Mercancía dañada, Conteo físico..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {form.formState.isSubmitting ? "Guardando..." : "Confirmar Ajuste"}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
