import { z } from 'zod';

export const createSaleSchema = z.object({
  branchId: z.string().min(1, "El branchId es requerido"),
  items: z.array(z.object({
    productId: z.string().min(1, "El productId es requerido"),
    quantity: z.number().int().positive("La cantidad debe ser entera y mayor a cero")
  })).min(1, "La venta debe incluir al menos un producto"),
  cashSessionId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  paymentMethod: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTROS']).default('EFECTIVO'),
  paymentAmount: z.number().positive().optional().nullable(),
});
