import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  permissions: z.array(z.string()), // array de permission IDs
});

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
    return sendSuccess(res, roles);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener roles', 500);
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany();
    return sendSuccess(res, permissions);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener permisos', 500);
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const result = createRoleSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);

    const { name, description, permissions } = result.data;

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return sendError(res, 'CONFLICT', 'El rol ya existe', 409);

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map(id => ({ permissionId: id }))
        }
      },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    return sendSuccess(res, role, 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear rol', 500);
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = createRoleSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return sendError(res, 'NOT_FOUND', 'Rol no encontrado', 404);


    const { name, description, permissions } = result.data;

    // Primero borramos todos los permisos viejos
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    // Actualizamos y creamos los nuevos
    const updated = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          create: permissions.map(pid => ({ permissionId: pid }))
        }
      },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    return sendSuccess(res, updated);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar rol', 500);
  }
};

const assignUsersSchema = z.object({
  userIds: z.array(z.string().uuid()),
});

export const assignUsersToRole = async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id as string;
    const result = assignUsersSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return sendError(res, 'NOT_FOUND', 'Rol no encontrado', 404);

    const { userIds } = result.data;

    // Actualizar todos los usuarios para que tengan este rol
    await prisma.user.updateMany({
      where: {
        id: { in: userIds }
      },
      data: {
        roleId: roleId
      }
    });

    return sendSuccess(res, { message: 'Usuarios asignados correctamente' });
  } catch (error) {
    console.error('Error assignUsersToRole:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al asignar usuarios', 500);
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return sendError(res, 'NOT_FOUND', 'Rol no encontrado', 404);
    if (role.isSystem) return sendError(res, 'FORBIDDEN', 'No puedes eliminar roles de sistema', 403);

    await prisma.role.update({
      where: { id },
      data: { isActive: false }
    });
    return sendSuccess(res, { message: 'Rol eliminado lógicamente' });
  } catch (error) {
    console.error('Error deleteRole:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al eliminar rol', 500);
  }
};
