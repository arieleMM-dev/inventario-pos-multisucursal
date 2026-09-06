import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const branchSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre de la sucursal es requerido"),
  taxId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  address: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  phone: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  email: z.string().email("Correo inválido").optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  timezone: z.string().min(1, "La zona horaria es requerida").default("UTC")
});

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, address: true, taxId: true, phone: true, email: true, timezone: true }
    });
    return sendSuccess(res, branches);
  } catch (error) {
    console.error('Error getBranches:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener sucursales', 500);
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const result = branchSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    const branch = await prisma.branch.create({
      data: result.data
    });
    return sendSuccess(res, branch, 201);
  } catch (error) {
    console.error('Error createBranch:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear sucursal', 500);
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = branchSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    const branch = await prisma.branch.update({
      where: { id },
      data: result.data
    });
    return sendSuccess(res, branch);
  } catch (error) {
    console.error('Error updateBranch:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar sucursal', 500);
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.branch.update({
      where: { id },
      data: { isActive: false }
    });
    return sendSuccess(res, { message: 'Sucursal eliminada lógicamente' });
  } catch (error) {
    console.error('Error deleteBranch:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al eliminar sucursal', 500);
  }
};
