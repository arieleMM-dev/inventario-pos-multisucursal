import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

export const getCurrentSession = async (req: Request, res: Response) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;
    
    if (!branchId) return sendError(res, 'BAD_REQUEST', 'Usuario no tiene sucursal asignada', 400);

    const session = await prisma.cashSession.findFirst({
      where: {
        branchId,
        cashierId: userId,
        status: 'OPEN'
      }
    });

    return sendSuccess(res, session);
  } catch (error) {
    console.error('Error getCurrentSession:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener sesión de caja', 500);
  }
};

const openSessionSchema = z.object({
  initialFund: z.number().min(0, "El fondo inicial no puede ser negativo")
});

export const openSession = async (req: Request, res: Response) => {
  try {
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;

    if (!branchId) return sendError(res, 'BAD_REQUEST', 'Usuario no tiene sucursal asignada', 400);

    const result = openSessionSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);

    // Verify if already open
    const existing = await prisma.cashSession.findFirst({
      where: { branchId, cashierId: userId, status: 'OPEN' }
    });

    if (existing) {
      return sendError(res, 'CONFLICT', 'Ya tienes una sesión de caja abierta', 409);
    }

    const session = await prisma.cashSession.create({
      data: {
        branchId,
        cashierId: userId,
        initialFund: result.data.initialFund,
        status: 'OPEN'
      }
    });

    return sendSuccess(res, session, 201);
  } catch (error) {
    console.error('Error openSession:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al abrir caja', 500);
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const branchId = req.user!.branchId;
    const userId = req.user!.userId;

    const session = await prisma.cashSession.findUnique({
      where: { id },
      include: { sales: true }
    });

    if (!session || session.status !== 'OPEN') {
      return sendError(res, 'NOT_FOUND', 'Sesión no encontrada o ya cerrada', 404);
    }

    if (session.cashierId !== userId && req.user!.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'No puedes cerrar la caja de otro usuario', 403);
    }

    // Calcular el dinero total
    const totalSales = session.sales.reduce((sum, sale) => sum + sale.total, 0);
    const finalFund = session.initialFund + totalSales;

    const closedSession = await prisma.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endTime: new Date(),
        finalFund
      }
    });

    return sendSuccess(res, closedSession);
  } catch (error) {
    console.error('Error closeSession:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al cerrar caja', 500);
  }
};
