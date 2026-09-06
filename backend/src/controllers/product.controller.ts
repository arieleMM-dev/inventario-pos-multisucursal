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

    const hasGlobalRead = req.user?.isSuperAdmin || req.user?.permissions.includes('INVENTORY_READ_GLOBAL');
    
    // Si no tiene permiso global y no especifica sucursal, es un error (o forzamos su sucursal base)
    if (!branchId && !hasGlobalRead) {
      return sendError(res, 'BAD_REQUEST', 'Debe enviar el parámetro branchId', 400);
    }

    const whereClause: any = { isActive: true };
    if (category) {
      whereClause.categoryId = String(category);
    }

    // Buscamos productos e incluimos el stock
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        inventories: hasGlobalRead && !branchId 
          ? { include: { branch: { select: { name: true } } } } // Retorna stock de todas las sucursales si no se filtró una
          : { where: { branchId: String(branchId) } } // Retorna stock solo de la sucursal solicitada
      }
    });

    const mappedProducts = products.map((product: any) => {
      // Si hay múltiples sucursales (global read), calculamos el stock total y agregamos el desglose
      const totalStock = product.inventories.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
      const stockQuantity = (hasGlobalRead && !branchId) ? totalStock : (product.inventories[0]?.quantity || 0);
      const minStock = product.inventories[0]?.minStock || 0;
      return {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category?.name || '-',
        categoryId: product.categoryId,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        minStock: minStock,
        stockInBranch: stockQuantity,
        isTracked: product.isTracked,
        allStocks: hasGlobalRead ? product.inventories : undefined,
        status: product.isTracked ? getProductStatus(stockQuantity, minStock) : 'NORMAL',
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
    console.log("=== CREATE PRODUCT PAYLOAD ===");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("===============================");
    
    const result = createProductSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de producto inválidos', 400, result.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })));
    }

    const { sku, name, categoryId, costPrice, sellingPrice, barcode, description, unitOfMeasure, isTracked, initialStock, branchId, minStock, maxStock } = result.data;
    const userId = req.user!.userId;

    const issues = [];
    
    let finalSku = sku;
    if (finalSku.endsWith('-')) {
      const count = await prisma.product.count({ where: { categoryId } });
      finalSku = `${finalSku}${(count + 1).toString().padStart(3, '0')}`;
    }

    const existingSku = await prisma.product.findUnique({ where: { sku: finalSku } });
    if (existingSku) issues.push({ field: 'sku', message: 'El SKU ya está en uso' });

    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) issues.push({ field: 'barcode', message: 'El código de barras ya está registrado' });
    }

    if (initialStock && initialStock > 0 && !branchId) {
      issues.push({ field: 'branchId', message: 'Se requiere la sucursal para definir el stock inicial' });
    }

    if (issues.length > 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, issues);
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { sku: finalSku, name, categoryId, costPrice, sellingPrice, barcode, description, unitOfMeasure, isTracked }
      });

      if (initialStock && initialStock > 0 && branchId) {
        await tx.inventory.create({
          data: {
            productId: product.id,
            branchId,
            quantity: initialStock,
            minStock: minStock || 0,
            maxStock: maxStock || null,
          }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            branchId,
            type: 'INGRESO',
            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Stock Inicial',
            createdById: userId,
          }
        });
      }

      return product;
    });

    return sendSuccess(res, newProduct, 201);
  } catch (error) {
    console.error(error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear producto', 500);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = createProductSchema.safeParse(req.body);
    if (!result.success) return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })));
    
    const { sku, barcode, name, categoryId, costPrice, sellingPrice, description, unitOfMeasure, isTracked } = result.data;
    const issues = [];

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku && existingSku.id !== id) issues.push({ field: 'sku', message: 'El SKU ya está en uso por otro producto' });

    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode && existingBarcode.id !== id) issues.push({ field: 'barcode', message: 'El código de barras ya está registrado en otro producto' });
    }

    if (issues.length > 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos duplicados', 400, issues);
    }

    const product = await prisma.product.update({
      where: { id },
      data: { sku, name, categoryId, costPrice, sellingPrice, barcode, description, unitOfMeasure, isTracked }
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

    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: String(id),
          branchId: String(branchId)
        }
      }
    });

    const quantity = inventory?.quantity || 0;
    const minStock = inventory?.minStock || 0;

    return sendSuccess(res, {
      productId: product.id,
      branchId: String(branchId),
      quantity,
      status: getProductStatus(quantity, minStock)
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
      return sendError(res, 'VALIDATION_ERROR', 'Datos de ajuste inválidos', 400, result.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })));
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

    const updatedStock = await prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findUnique({
        where: { productId_branchId: { productId: id, branchId } }
      });

      const previousQuantity = inventory?.quantity || 0;
      const newQuantity = previousQuantity + adjustment;

      if (newQuantity < 0) {
        throw new Error('El ajuste resultaría en un stock negativo');
      }

      inventory = await tx.inventory.upsert({
        where: { productId_branchId: { productId: id, branchId } },
        update: { quantity: newQuantity },
        create: { productId: id, branchId, quantity: newQuantity }
      });

      await tx.inventoryMovement.create({
        data: {
          productId: id,
          branchId,
          type: 'AJUSTE',
          quantity: Math.abs(adjustment), 
          previousStock: previousQuantity,
          newStock: newQuantity,
          reason,
          createdById: userId,
        }
      });

      return inventory;
    });

    // Emitir evento de socket
    const io = getIO();
    const minStock = updatedStock.minStock;
    const status = getProductStatus(updatedStock.quantity, minStock);
    
    io.to(`branch:${branchId}`).emit('stock:updated', {
      productId: id,
      branchId,
      newQuantity: updatedStock.quantity,
      status
    });

    if (updatedStock.quantity <= minStock) {
      io.to(`branch:${branchId}`).emit('stock:low', {
        productId: id,
        branchId,
        currentQuantity: updatedStock.quantity,
        minStock: minStock
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
