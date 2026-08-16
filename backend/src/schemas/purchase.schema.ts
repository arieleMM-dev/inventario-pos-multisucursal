import { z } from 'zod';

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "El ID del proveedor es requerido"),
  branchId: z.string().min(1, "El ID de la sucursal es requerido"),
  items: z.array(z.object({
    productId: z.string().min(1, "El ID del producto es requerido"),
    quantity: z.number().int().positive("La cantidad debe ser entera y mayor a cero"),
    unitCost: z.number().positive("El costo unitario debe ser positivo")
  })).min(1, "Debe incluir al menos un producto en la orden")
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(["RECIBIDO", "CANCELADO"])
});
