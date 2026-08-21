import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import * as argon2 from 'argon2';
import { z } from 'zod';

const userSchema = z.object({
  firstName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "Nombre es requerido"),
  lastName: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios permitidos").min(1, "Apellido es requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 especial").optional(),
  roleId: z.string().uuid("Rol inválido"),
  branchId: z.string().uuid("Sucursal inválida").optional().nullable()
});

const profileSchema = z.object({
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  email: z.string().email("Correo inválido").optional(),
});

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        role: true,
        branch: { select: { name: true } }
      }
    });
    
    // Flatten role name para el frontend
    const formatted = users.map(u => ({
      ...u,
      roleName: u.role.name
    }));
    return sendSuccess(res, formatted);
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

    const hash = await argon2.hash(result.data.password);
    const user = await prisma.user.create({
      data: {
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
        passwordHash: hash,
        roleId: result.data.roleId,
        branchId: result.data.branchId
      },
      include: { role: true, branch: { select: { name: true } } }
    });

    return sendSuccess(res, user, 201);
  } catch (error) {
    console.error('Error createUser:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear usuario', 500);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = userSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'NOT_FOUND', 'Usuario no encontrado', 404);

    const emailCheck = await prisma.user.findUnique({ where: { email: result.data.email } });
    if (emailCheck && emailCheck.id !== id) return sendError(res, 'CONFLICT', 'El correo ya está en uso', 409);

    const dataToUpdate: any = {
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      email: result.data.email,
      roleId: result.data.roleId,
      branchId: result.data.branchId
    };

    if (result.data.password) {
      dataToUpdate.passwordHash = await argon2.hash(result.data.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: { role: true, branch: { select: { name: true } } }
    });

    return sendSuccess(res, user);
  } catch (error) {
    console.error('Error updateUser:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar usuario', 500);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    return sendSuccess(res, { message: 'Usuario eliminado lógicamente' });
  } catch (error) {
    console.error('Error deleteUser:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al eliminar usuario', 500);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendError(res, 'UNAUTHORIZED', 'No autenticado', 401);

    const result = profileSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);

    if (result.data.email) {
      const emailCheck = await prisma.user.findUnique({ where: { email: result.data.email } });
      if (emailCheck && emailCheck.id !== userId) return sendError(res, 'CONFLICT', 'El correo ya está en uso', 409);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: result.data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, role: { select: { name: true } } }
    });

    return sendSuccess(res, updated);
  } catch (error) {
    console.error('Error updateProfile:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar perfil', 500);
  }
};
