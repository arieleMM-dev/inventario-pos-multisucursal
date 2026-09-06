import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  parentId: z.string().uuid("El ID de la categoría padre debe ser un UUID").optional().nullable(),
});

export const updateCategorySchema = createCategorySchema;
