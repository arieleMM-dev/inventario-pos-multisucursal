import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createSaleSchema } from '../schemas/sale.schema';
import { sendSuccess, sendError } from '../utils/response';
import { getIO } from '../utils/socket';

// Reutilizamos la lógica de estado de BR-08
function getProductStatus(quantity: number, minStock: number) {
  if (quantity === 0) return 'AGOTADO';
  if (quantity <= minStock) return 'STOCK_BAJO';
  return 'NORMAL';
}

export const createSale = async (req: Request, res: Response) => {
  try {
    const result = createSaleSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de venta inválidos', 400, result.error.issues);
    }
    
    const { branchId, items } = result.data;
    const cashierId = req.user!.userId;

    // Acumulador de eventos para emitir DESPUÉS de que la transacción se haya confirmado
    const eventsToEmit: { type: string, payload: any }[] = [];

    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;
      const saleItemsData: { productId: string, quantity: number, unitPrice: number }[] = [];
      const stockMovementData: any[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        }

        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.sellingPrice
        });
        
        total += product.sellingPrice * item.quantity;

        if (product.isTracked) {
          // Bloqueo Optimista: Usamos queryRaw para poder obtener el 'quantity' actualizado (RETURNING)
          const updateResult: any[] = await tx.$queryRaw`
            UPDATE "Inventory"
            SET quantity = quantity - ${item.quantity}
            WHERE "productId" = ${item.productId}
              AND "branchId" = ${branchId}
              AND quantity >= ${item.quantity}
            RETURNING quantity
          `;

          if (updateResult.length === 0) {
            throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
          }

          const newQuantity = updateResult[0].quantity;
          const previousQuantity = newQuantity + item.quantity;

          const inventory = await tx.inventory.findUnique({
            where: { productId_branchId: { productId: item.productId, branchId } }
          });
          const minStock = inventory?.minStock || 0;

          stockMovementData.push({
            productId: item.productId,
            branchId,
            type: 'VENTA',
            quantity: -item.quantity,
            previousStock: previousQuantity,
            newStock: newQuantity,
            createdById: cashierId
          });

          const status = getProductStatus(newQuantity, minStock);

          // Preparamos evento stock:updated
          eventsToEmit.push({
            type: 'stock:updated',
            payload: { productId: item.productId, branchId, newQuantity, status }
          });

          // Regla BR-07: Emitir stock:low SOLO cuando cruza el umbral (de arriba hacia abajo)
          if (previousQuantity > minStock && newQuantity <= minStock) {
            eventsToEmit.push({
              type: 'stock:low',
              payload: { productId: item.productId, branchId, currentQuantity: newQuantity, minStock: minStock }
            });
          }
        }
      }

      // Verify Cash Session if provided
      if (req.body.cashSessionId) {
        const session = await tx.cashSession.findUnique({ where: { id: req.body.cashSessionId }});
        if (!session || session.status !== 'OPEN') {
            throw new Error('La sesión de caja no es válida o está cerrada');
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          branchId,
          cashierId,
          total,
          cashSessionId: req.body.cashSessionId || null,
          clientId: req.body.clientId || null,
          paymentMethod: req.body.paymentMethod || 'EFECTIVO',
          paymentAmount: req.body.paymentAmount || null,
          items: {
            create: saleItemsData
          }
        },
        include: { items: true }
      });

      for (const smData of stockMovementData) {
        await tx.inventoryMovement.create({
          data: {
            ...smData,
            referenceId: createdSale.id
          }
        });
      }

      return createdSale;
    });

    // Si la transacción fue exitosa, emitimos los eventos de Socket.io
    if (process.env.NODE_ENV !== 'test') {
      try {
        const io = getIO();
        for (const event of eventsToEmit) {
          io.to(`branch:${branchId}`).emit(event.type, event.payload);
        }
      } catch (err) {
        console.error('Error emitiendo eventos de socket:', err);
      }
    }

    return sendSuccess(res, sale, 201);
  } catch (error: any) {
    if (error.message && error.message.startsWith('INSUFFICIENT_STOCK:')) {
      const pId = error.message.split(':')[1];
      return sendError(res, 'INSUFFICIENT_STOCK', `No hay stock suficiente para el producto (ID: ${pId})`, 409, { productId: pId });
    }
    if (error.message && error.message.startsWith('PRODUCT_NOT_FOUND:')) {
      const pId = error.message.split(':')[1];
      return sendError(res, 'NOT_FOUND', `Producto no encontrado (ID: ${pId})`, 404, { productId: pId });
    }
    if (error.message === 'La sesión de caja no es válida o está cerrada') {
      return sendError(res, 'BAD_REQUEST', error.message, 400);
    }
    console.error('Error en createSale:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al procesar la venta', 500);
  }
};
