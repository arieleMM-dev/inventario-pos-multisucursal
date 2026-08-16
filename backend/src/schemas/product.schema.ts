import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string()
    .min(3, "El SKU debe tener al menos 3 caracteres")
    .max(30, "El SKU no puede exceder 30 caracteres")
    .regex(/^[a-zA-Z0-9-]+$/, "El SKU solo puede contener letras, números y guiones"),
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  price: z.number().positive("El precio debe ser un número positivo"),
  minStock: z.number().int().nonnegative("El stock mínimo debe ser entero y mayor o igual a 0"),
});

export const adjustStockSchema = z.object({
  branchId: z.string().uuid("ID de sucursal inválido"),
  adjustment: z.number().int("El ajuste debe ser un número entero"),
  reason: z.string().min(1, "El motivo es requerido"),
});
