import { z } from 'zod';

export const createSaleSchema = z.object({
  branchId: z.string().min(1, "El branchId es requerido"),
  items: z.array(z.object({
    productId: z.string().min(1, "El productId es requerido"),
    quantity: z.number().int().positive("La cantidad debe ser entera y mayor a cero")
  })).min(1, "La venta debe incluir al menos un producto")
});
