import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getRotationReport = async (req: Request, res: Response) => {
  try {
    const { branchId, from, to } = req.query;

    if (!branchId) {
      return sendError(res, 'VALIDATION_ERROR', 'branchId es requerido', 400);
    }

    // Default: Últimos 30 días si no se proveen fechas
    const toDate = to ? new Date(to as string) : new Date();
    const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(toDate.getDate() - 30));

    // Agrupar movimientos de VENTA por productId
    const movements = await prisma.inventoryMovement.groupBy({
      by: ['productId'],
      where: {
        branchId: branchId as string,
        type: 'VENTA',
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      _sum: {
        quantity: true
      }
    });

    const productIds = movements.map((m: any) => m.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sellingPrice: true }
    });

    const data = movements.map((m: any) => {
      const product = products.find(p => p.id === m.productId);
      // Movimientos de venta son negativos, los volvemos positivos para el reporte
      const unitsSold = Math.abs(m._sum.quantity || 0); 
      const revenue = unitsSold * (product?.sellingPrice || 0);

      return {
        productId: m.productId,
        name: product?.name || 'Desconocido',
        unitsSold,
        revenue
      };
    }).sort((a: any, b: any) => b.unitsSold - a.unitsSold); // Ordenar por más vendidos

    return sendSuccess(res, data);
  } catch (error) {
    console.error('Error getRotationReport:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al generar el reporte de rotación', 500);
  }
};

export const getLowStockReport = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      return sendError(res, 'VALIDATION_ERROR', 'branchId es requerido', 400);
    }

    // Obtenemos los stocks y los cruzamos con Product para evaluar contra minStock
    // En SQL puro sería un JOIN y WHERE quantity <= minStock
    // Con Prisma podemos obtener los Inventories y hacer el cruce en memoria
    const inventories = await prisma.inventory.findMany({
      where: { branchId: branchId as string },
      include: { product: { select: { name: true } } }
    });

    const lowStockItems = inventories
      .filter((bs: any) => bs.quantity <= bs.minStock)
      .map((bs: any) => ({
        productId: bs.productId,
        name: bs.product.name,
        quantity: bs.quantity,
        minStock: bs.minStock
      }));

    return sendSuccess(res, lowStockItems);
  } catch (error) {
    console.error('Error getLowStockReport:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al generar el reporte de stock bajo', 500);
  }
};

export const getKPIs = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;

    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const totalBranches = await prisma.branch.count({ where: { isActive: true } });

    const stocks = await prisma.inventory.findMany({
      where: branchId ? { branchId: String(branchId) } : {},
      include: { product: true }
    });

    const totalStockValue = stocks.reduce((acc: any, stock: any) => acc + (stock.quantity * stock.product.sellingPrice), 0);

    return sendSuccess(res, {
      activeUsers,
      totalBranches,
      totalStockValue
    });
  } catch (error) {
    console.error('Error getKPIs:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener KPIs', 500);
  }
};

export const getSalesTrend = async (req: Request, res: Response) => {
  try {
    const { branchId, from, to } = req.query;
    const toDate = to ? new Date(to as string) : new Date();
    const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(toDate.getDate() - 30));

    const sales = await prisma.sale.findMany({
      where: {
        branchId: branchId ? String(branchId) : undefined,
        createdAt: { gte: fromDate, lte: toDate }
      },
      select: { total: true, createdAt: true }
    });

    const grouped = sales.reduce((acc: any, sale) => {
      const dateStr = sale.createdAt.toISOString().split('T')[0];
      acc[dateStr] = (acc[dateStr] || 0) + sale.total;
      return acc;
    }, {});

    const trend = Object.entries(grouped).map(([date, total]) => ({
      date,
      total
    })).sort((a, b) => a.date.localeCompare(b.date));

    return sendSuccess(res, trend);
  } catch (error) {
    console.error('Error getSalesTrend:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener tendencia de ventas', 500);
  }
};
