import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { createProductSchema, adjustStockSchema } from '../schemas/product.schema';
import { sendSuccess, sendError } from '../utils/response';
import { getIO } from '../utils/socket';

// Regla BR-08: El estado se calcula al vuelo, nunca se guarda
function getProductStatus(quantity: number, minStock: number) {
  if (quantity === 0) return 'AGOTADO';
  if (quantity <= minStock) return 'STOCK_BAJO';
  return 'NORMAL';
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { branchId, category, lowStockOnly } = req.query;

    if (!branchId) {
      return sendError(res, 'BAD_REQUEST', 'Debe enviar el parámetro branchId', 400);
    }

    const whereClause: any = { isActive: true };
    if (category) {
      whereClause.category = String(category);
    }

    // Buscamos productos e incluimos el stock SÓLO para la sucursal pedida
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        stocks: {
          where: { branchId: String(branchId) }
        }
      }
    });

    const mappedProducts = products.map((product: any) => {
      const stockQuantity = product.stocks[0]?.quantity || 0;
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        price: product.price,
        minStock: product.minStock,
        stockInBranch: stockQuantity,
        status: getProductStatus(stockQuantity, product.minStock),
      };
    });

    // Filtro adicional en memoria para "lowStockOnly"
    let finalProducts = mappedProducts;
    if (lowStockOnly === 'true') {
      finalProducts = finalProducts.filter((p: any) => p.status === 'STOCK_BAJO' || p.status === 'AGOTADO');
    }

    return sendSuccess(res, finalProducts);
  } catch (error) {
    console.error('Error en getProducts:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener catálogo de productos', 500);
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const result = createProductSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de producto inválidos', 400, result.error.issues);
    }

    const { sku, name, category, price, minStock } = result.data;

    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return sendError(res, 'CONFLICT', 'El SKU ya está registrado', 409);
    }

    const newProduct = await prisma.product.create({
      data: { sku, name, category, price, minStock }
    });

    return sendSuccess(res, newProduct, 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear producto', 500);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = createProductSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues);
    
    const product = await prisma.product.update({
      where: { id },
      data: result.data
    });
    return sendSuccess(res, product);
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar producto', 500);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
    return sendSuccess(res, { message: 'Producto eliminado lógicamente' });
  } catch (error) {
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al eliminar producto', 500);
  }
};

export const getProductStock = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { branchId } = req.query;

    if (!branchId) {
      return sendError(res, 'BAD_REQUEST', 'Falta el parámetro branchId', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: String(id) },
    });

    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Producto no encontrado', 404);
    }

    const branchStock = await prisma.branchStock.findUnique({
      where: {
        productId_branchId: {
          productId: String(id),
          branchId: String(branchId)
        }
      }
    });

    const quantity = branchStock?.quantity || 0;

    return sendSuccess(res, {
      productId: product.id,
      branchId: String(branchId),
      quantity,
      status: getProductStatus(quantity, product.minStock)
    });
  } catch (error) {
    console.error('Error en getProductStock:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al consultar stock del producto', 500);
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = adjustStockSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de ajuste inválidos', 400, result.error.issues);
    }

    const { branchId, adjustment, reason } = result.data;
    const userId = req.user!.userId;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Producto no encontrado', 404);
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return sendError(res, 'NOT_FOUND', 'Sucursal no encontrada', 404);
    }

    // Usar transacción para actualizar stock y crear movimiento
    const updatedStock = await prisma.$transaction(async (tx) => {
      let branchStock = await tx.branchStock.findUnique({
        where: { productId_branchId: { productId: id, branchId } }
      });

      const previousQuantity = branchStock?.quantity || 0;
      const newQuantity = previousQuantity + adjustment;

      if (newQuantity < 0) {
        throw new Error('El ajuste resultaría en un stock negativo');
      }

      branchStock = await tx.branchStock.upsert({
        where: { productId_branchId: { productId: id, branchId } },
        update: { quantity: newQuantity },
        create: { productId: id, branchId, quantity: newQuantity }
      });

      await tx.stockMovement.create({
        data: {
          productId: id,
          branchId,
          type: 'AJUSTE',
          quantity: Math.abs(adjustment), // Puede ser útil mantener el signo, pero quantity suele ser positivo. Guardaremos el cambio real en newQuantity y previousStock.
          previousStock: previousQuantity,
          newStock: newQuantity,
          referenceId: reason,
          createdById: userId,
        }
      });

      return branchStock;
    });

    // Emitir evento de socket
    const io = getIO();
    const status = getProductStatus(updatedStock.quantity, product.minStock);
    
    io.to(`branch:${branchId}`).emit('stock:updated', {
      productId: id,
      branchId,
      newQuantity: updatedStock.quantity,
      status
    });

    if (updatedStock.quantity <= product.minStock) {
      io.to(`branch:${branchId}`).emit('stock:low', {
        productId: id,
        branchId,
        currentQuantity: updatedStock.quantity,
        minStock: product.minStock
      });
    }

    return sendSuccess(res, { stock: updatedStock }, 200);

  } catch (error: any) {
    console.error('Error en adjustStock:', error);
    if (error.message === 'El ajuste resultaría en un stock negativo') {
      return sendError(res, 'BAD_REQUEST', error.message, 400);
    }
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al ajustar el stock', 500);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    
    return sendSuccess(res, categories.map(c => c.category));
  } catch (error) {
    console.error('Error en getCategories:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener categorías', 500);
  }
};

export const getNextSku = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    if (!category || category.length < 3) {
      return sendError(res, 'BAD_REQUEST', 'Categoría inválida o muy corta (mínimo 3 letras)', 400);
    }
    
    const prefix = category.substring(0, 3).toUpperCase();
    
    const products = await prisma.product.findMany({
      where: { sku: { startsWith: `${prefix}-` } },
      select: { sku: true }
    });
    
    let maxNumber = 0;
    for (const p of products) {
      const parts = p.sku.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    const nextSku = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    
    return sendSuccess(res, { sku: nextSku });
  } catch (error) {
    console.error('Error en getNextSku:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al calcular siguiente SKU', 500);
  }
};
