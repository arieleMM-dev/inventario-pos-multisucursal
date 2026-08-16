import { z } from 'zod';

export const createTransferSchema = z.object({
  productId: z.string().min(1, "El productId es requerido"),
  originBranchId: z.string().min(1, "El originBranchId es requerido"),
  destinationBranchId: z.string().min(1, "El destinationBranchId es requerido"),
  quantity: z.number().int().positive("La cantidad debe ser entera y mayor a cero")
}).refine(data => data.originBranchId !== data.destinationBranchId, {
  message: "La sucursal de origen y destino no pueden ser la misma",
  path: ["destinationBranchId"]
});

export const updateTransferStatusSchema = z.object({
  status: z.enum(["EN_TRANSITO", "RECIBIDO", "CANCELADO"])
});
