import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createTransferSchema, updateTransferStatusSchema } from '../schemas/transfer.schema';
import { sendSuccess, sendError } from '../utils/response';
import { getIO } from '../utils/socket';
import { TransferStatus } from '@prisma/client';

// Helper de permisos (BR-06)
function isAuthorizedForBranch(user: any, targetBranchId: string) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'ENCARGADO' && user.branchId === targetBranchId) return true;
  return false;
}

export const getTransfers = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    
    // Si no se especifica sucursal, admin ve todo
    let whereClause = {};
    if (branchId) {
      whereClause = {
        OR: [
          { originBranchId: String(branchId) },
          { destinationBranchId: String(branchId) }
        ]
      };
    } else if (req.user!.role !== 'ADMIN') {
      // Si no es admin y no manda branchId, forzamos su branchId
      whereClause = {
        OR: [
          { originBranchId: req.user!.branchId },
          { destinationBranchId: req.user!.branchId }
        ]
      };
    }

    const transfers = await prisma.stockTransfer.findMany({
      where: whereClause,
      include: {
        product: { select: { name: true, sku: true } },
        originBranch: { select: { name: true } },
        destinationBranch: { select: { name: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, transfers);
  } catch (error) {
    console.error('Error getTransfers:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener transferencias', 500);
  }
};

export const createTransfer = async (req: Request, res: Response) => {
  try {
    const result = createTransferSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    }
    
    const { productId, originBranchId, destinationBranchId, quantity } = result.data;
    const userId = req.user!.userId;

    if (!isAuthorizedForBranch(req.user, originBranchId)) {
      return sendError(res, 'FORBIDDEN', 'No tienes permiso para iniciar transferencias desde esta sucursal', 403);
    }

    // Validar que exista el producto
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Producto no encontrado', 404);
    }

    // Validar que la cantidad no exceda el stock actual al momento de CREAR
    const originStock = await prisma.branchStock.findUnique({
      where: { productId_branchId: { productId, branchId: originBranchId } }
    });

    if (!originStock || originStock.quantity < quantity) {
      return sendError(res, 'INSUFFICIENT_STOCK', 'Stock insuficiente en la sucursal origen para la transferencia', 409);
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        productId,
        originBranchId,
        destinationBranchId,
        quantity,
        status: 'PENDIENTE',
        createdById: userId
      }
    });

    return sendSuccess(res, transfer, 201);
  } catch (error) {
    console.error('Error createTransfer:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear la transferencia', 500);
  }
};

export const updateTransferStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = updateTransferStatusSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    }

    const { status } = result.data;
    const userId = req.user!.userId;

    const transferId = id as string;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { product: true, originBranch: true }
    });

    if (!transfer) {
      return sendError(res, 'NOT_FOUND', 'Transferencia no encontrada', 404);
    }

    // Lógica por transiciones de estado
    if (transfer.status === 'PENDIENTE' && status === 'EN_TRANSITO') {
      if (!isAuthorizedForBranch(req.user, transfer.originBranchId)) {
        return sendError(res, 'FORBIDDEN', 'No tienes permiso para enviar esta transferencia', 403);
      }

      // BR-04: Descontar stock de origen en la transición a EN_TRANSITO
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const updateResult: any[] = await tx.$queryRaw`
          UPDATE "BranchStock"
          SET quantity = quantity - ${transfer.quantity}
          WHERE "productId" = ${transfer.productId}
            AND "branchId" = ${transfer.originBranchId}
            AND quantity >= ${transfer.quantity}
          RETURNING quantity
        `;

        if (updateResult.length === 0) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        const newStock = updateResult[0].quantity;
        const previousStock = newStock + transfer.quantity;

        await tx.stockMovement.create({
          data: {
            productId: transfer.productId,
            branchId: transfer.originBranchId,
            type: 'TRANSFERENCIA_SALIDA',
            quantity: -transfer.quantity,
            previousStock,
            newStock,
            referenceId: transfer.id,
            createdById: userId
          }
        });

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'EN_TRANSITO' }
        });
      });

      // Emitir evento al destino de que viene mercancía en camino
      if (process.env.NODE_ENV !== 'test') {
        try {
          getIO().to(`branch:${transfer.destinationBranchId}`).emit('transfer:incoming', {
            transferId: transfer.id,
            productId: transfer.productId,
            quantity: transfer.quantity,
            originBranchName: (transfer as any).originBranch.name
          });
        } catch (e) {
          console.error(e);
        }
      }

      return sendSuccess(res, updatedTransfer);

    } else if (transfer.status === 'EN_TRANSITO' && status === 'RECIBIDO') {
      if (!isAuthorizedForBranch(req.user, transfer.destinationBranchId)) {
        return sendError(res, 'FORBIDDEN', 'No tienes permiso para recibir en esta sucursal', 403);
      }

      // Implementación estricta de sección 5.2 de la documentación
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // Obtenemos el stock previo o creamos si no existe
        const branchStock = await tx.branchStock.upsert({
          where: { productId_branchId: { productId: transfer.productId, branchId: transfer.destinationBranchId } },
          update: { quantity: { increment: transfer.quantity } },
          create: { productId: transfer.productId, branchId: transfer.destinationBranchId, quantity: transfer.quantity }
        });

        await tx.stockMovement.create({
          data: {
            productId: transfer.productId,
            branchId: transfer.destinationBranchId,
            type: 'TRANSFERENCIA_ENTRADA',
            quantity: transfer.quantity,
            previousStock: branchStock.quantity - transfer.quantity,
            newStock: branchStock.quantity,
            referenceId: transfer.id,
            createdById: userId
          }
        });

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'RECIBIDO', receivedAt: new Date() }
        });
      });

      return sendSuccess(res, updatedTransfer);

    } else if (transfer.status === 'EN_TRANSITO' && status === 'CANCELADO') {
      if (!isAuthorizedForBranch(req.user, transfer.originBranchId) && !isAuthorizedForBranch(req.user, transfer.destinationBranchId)) {
         return sendError(res, 'FORBIDDEN', 'No tienes permiso para cancelar esta transferencia', 403);
      }

      // BR-05: Si se cancela, el stock regresa a la sucursal de origen
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const updateResult: any[] = await tx.$queryRaw`
          UPDATE "BranchStock"
          SET quantity = quantity + ${transfer.quantity}
          WHERE "productId" = ${transfer.productId}
            AND "branchId" = ${transfer.originBranchId}
          RETURNING quantity
        `;
        
        const newStock = updateResult[0].quantity;
        const previousStock = newStock - transfer.quantity;

        await tx.stockMovement.create({
          data: {
            productId: transfer.productId,
            branchId: transfer.originBranchId,
            type: 'AJUSTE', // o TRANSFERENCIA_ENTRADA por reversa
            quantity: transfer.quantity,
            previousStock,
            newStock,
            referenceId: transfer.id,
            createdById: userId
          }
        });

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'CANCELADO' }
        });
      });

      return sendSuccess(res, updatedTransfer);

    } else {
      return sendError(res, 'CONFLICT', `Transición de estado no válida de ${transfer.status} a ${status}`, 409);
    }

  } catch (error: any) {
    console.error('Error updateTransferStatus:', error);
    if (error.message === 'INSUFFICIENT_STOCK') {
      return sendError(res, 'INSUFFICIENT_STOCK', 'Stock insuficiente para enviar la transferencia', 409);
    }
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar transferencia', 500);
  }
};
