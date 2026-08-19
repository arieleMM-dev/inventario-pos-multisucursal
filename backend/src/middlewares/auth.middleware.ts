import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: string;
  isSystem: boolean;
  permissions: string[];
  branchId: string | null;
}

// Extender el Request de Express para incluir nuestro usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Token de acceso no proporcionado o inválido', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    return sendError(res, 'UNAUTHORIZED', 'Token expirado o inválido', 401);
  }
}

export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Usuario no autenticado', 401);
    }

    if (req.user.isSystem) {
      return next(); // System bypass
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return sendError(res, 'FORBIDDEN', `Falta el permiso: ${requiredPermission}`, 403);
    }
    next();
  };
}

// BR-09, BR-10, BR-11: Validar que el usuario tenga acceso a la sucursal específica
export function requireBranchAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 'UNAUTHORIZED', 'Usuario no autenticado', 401);
  }

  // System o usuarios con permiso global de sucursales tienen acceso a todas (BR-11)
  if (req.user.isSystem || req.user.permissions.includes('branches.manage_all')) {
    return next();
  }

  // Buscamos branchId en params, body o query (donde el cliente podría mandarlo)
  const targetBranchId = req.params?.branchId || req.body?.branchId || req.query?.branchId;

  if (!targetBranchId) {
    return sendError(res, 'BAD_REQUEST', 'Falta especificar branchId para verificar permisos', 400);
  }

  // CAJERO o ENCARGADO solo pueden operar en su sucursal asignada (BR-09, BR-10)
  if (req.user.branchId !== targetBranchId) {
    return sendError(res, 'FORBIDDEN', 'No tienes permiso para acceder o modificar datos de esta sucursal', 403);
  }

  next();
}
