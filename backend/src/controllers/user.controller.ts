import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  role: z.enum(['CAJERO', 'ENCARGADO', 'ADMIN']),
  branchId: z.string().uuid("Sucursal inválida").optional().nullable()
}).refine(data => {
  if ((data.role === 'CAJERO' || data.role === 'ENCARGADO') && !data.branchId) {
    return false;
  }
  return true;
}, {
  message: "Los CAJEROS y ENCARGADOS deben tener una sucursal asignada",
  path: ["branchId"]
});

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { name: true } }
      }
    });
    return sendSuccess(res, users);
  } catch (error) {
    console.error('Error getUsers:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener usuarios', 500);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const result = userSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    if (!result.data.password) {
      return sendError(res, 'VALIDATION_ERROR', 'La contraseña es obligatoria al crear un usuario', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email: result.data.email } });
    if (existing) return sendError(res, 'CONFLICT', 'El correo ya está registrado', 409);

    const hash = await bcrypt.hash(result.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        passwordHash: hash,
        role: result.data.role,
        branchId: result.data.role === 'ADMIN' ? null : result.data.branchId
      },
      select: { id: true, name: true, email: true, role: true, branchId: true }
    });

    return sendSuccess(res, user, 201);
  } catch (error) {
    console.error('Error createUser:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear usuario', 500);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = userSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'NOT_FOUND', 'Usuario no encontrado', 404);

    const emailCheck = await prisma.user.findUnique({ where: { email: result.data.email } });
    if (emailCheck && emailCheck.id !== id) return sendError(res, 'CONFLICT', 'El correo ya está en uso', 409);

    const dataToUpdate: any = {
      name: result.data.name,
      email: result.data.email,
      role: result.data.role,
      branchId: result.data.role === 'ADMIN' ? null : result.data.branchId
    };

    if (result.data.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(result.data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, branchId: true }
    });

    return sendSuccess(res, user);
  } catch (error) {
    console.error('Error updateUser:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar usuario', 500);
  }
};
