import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string()
    .min(3, "El SKU debe tener al menos 3 caracteres")
    .max(30, "El SKU no puede exceder 30 caracteres")
    .regex(/^[a-zA-Z0-9-]+$/, "El SKU solo puede contener letras, números y guiones"),
  name: z.string().min(1, "El nombre es requerido"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  barcode: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  costPrice: z.number().nonnegative("El costo debe ser un número positivo o cero"),
  sellingPrice: z.number().nonnegative("El precio de venta debe ser un número positivo o cero"),
  description: z.string().optional().nullable(),
  unitOfMeasure: z.enum(['UNIDAD', 'KILOGRAMO', 'LITRO', 'CAJA']).default('UNIDAD'),
  isTracked: z.boolean().default(true),
  
  initialStock: z.number().int().nonnegative().optional(),
  branchId: z.any().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().optional(),
});

export const adjustStockSchema = z.object({
  branchId: z.string().min(1, "ID de sucursal inválido"),
  adjustment: z.number().int("El ajuste debe ser un número entero"),
  reason: z.string().min(5, "El motivo es requerido y debe tener al menos 5 caracteres"),
});
