import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createPurchaseOrderSchema, updatePurchaseOrderStatusSchema } from '../schemas/purchase.schema';
import { sendSuccess, sendError } from '../utils/response';

export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const result = createPurchaseOrderSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    }
    
    const { supplierId, branchId, items } = result.data;
    
    // Verificamos permisos: Solo ADMIN o ENCARGADO de la sucursal
    const user = req.user as any;
    if (user.role !== 'ADMIN' && (user.role !== 'ENCARGADO' || user.branchId !== branchId)) {
      return sendError(res, 'FORBIDDEN', 'No tienes permiso para crear órdenes para esta sucursal', 403);
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        branchId,
        status: 'PENDIENTE',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost
          }))
        }
      },
      include: { items: true }
    });

    return sendSuccess(res, order, 201);
  } catch (error) {
    console.error('Error createPurchaseOrder:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear la orden de compra', 500);
  }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = updatePurchaseOrderStatusSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Estado inválido', 400, result.error.issues);
    }

    const { status } = result.data;
    const userId = req.user!.userId;
    const user = req.user as any;

    const orderId = id as string;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return sendError(res, 'NOT_FOUND', 'Orden de compra no encontrada', 404);
    }

    if (user.role !== 'ADMIN' && (user.role !== 'ENCARGADO' || user.branchId !== order.branchId)) {
      return sendError(res, 'FORBIDDEN', 'No tienes permiso para actualizar esta orden', 403);
    }

    if (order.status !== 'PENDIENTE') {
      return sendError(res, 'CONFLICT', 'Solo se pueden actualizar órdenes pendientes', 409);
    }

    if (status === 'RECIBIDO') {
      // Ingresar inventario
      const updatedOrder = await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const inventory = await tx.inventory.upsert({
            where: { productId_branchId: { productId: item.productId, branchId: order.branchId } },
            update: { quantity: { increment: item.quantity } },
            create: { productId: item.productId, branchId: order.branchId, quantity: item.quantity }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              branchId: order.branchId,
              type: 'INGRESO',
              quantity: item.quantity,
              previousStock: inventory.quantity - item.quantity,
              newStock: inventory.quantity,
              referenceId: order.id,
              createdById: userId
            }
          });
        }

        return tx.purchaseOrder.update({
          where: { id: orderId },
          data: { status: 'RECIBIDO' },
          include: { items: true }
        });
      });

      return sendSuccess(res, updatedOrder);
    } else if (status === 'CANCELADO') {
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELADO' }
      });
      return sendSuccess(res, updatedOrder);
    }

  } catch (error) {
    console.error('Error updatePurchaseOrderStatus:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar orden de compra', 500);
  }
};
