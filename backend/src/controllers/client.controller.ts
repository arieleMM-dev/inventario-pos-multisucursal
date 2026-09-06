import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

export const getClients = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { document: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      take: 20
    });
    return sendSuccess(res, clients);
  } catch (error) {
    console.error('Error getClients:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al buscar clientes', 500);
  }
};

const createClientSchema = z.object({
  firstName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "El nombre es requerido"),
  lastName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "El apellido es requerido"),
  email: z.string().email("Correo inválido").optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  document: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val)
});

export const createClient = async (req: Request, res: Response) => {
  try {
    const result = createClientSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    // Check document unique if provided
    if (result.data.document) {
      const existing = await prisma.client.findUnique({ where: { document: result.data.document } });
      if (existing) return sendError(res, 'CONFLICT', 'Ya existe un cliente con este documento', 409);
    }

    const client = await prisma.client.create({
      data: {
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email || null,
        document: result.data.document || null
      }
    });

    return sendSuccess(res, client, 201);
  } catch (error) {
    console.error('Error createClient:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear cliente', 500);
  }
};
