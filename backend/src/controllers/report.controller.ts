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
    const movements = await prisma.stockMovement.groupBy({
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

    const productIds = movements.map(m => m.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true }
    });

    const data = movements.map(m => {
      const product = products.find(p => p.id === m.productId);
      // Movimientos de venta son negativos, los volvemos positivos para el reporte
      const unitsSold = Math.abs(m._sum.quantity || 0); 
      const revenue = unitsSold * (product?.price || 0);

      return {
        productId: m.productId,
        name: product?.name || 'Desconocido',
        unitsSold,
        revenue
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold); // Ordenar por más vendidos

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
    // Con Prisma podemos obtener los BranchStock y hacer el cruce en memoria si no son demasiados, 
    // o usar queryRaw. Para este ejercicio, findMany con include.
    const branchStocks = await prisma.branchStock.findMany({
      where: { branchId: branchId as string },
      include: { product: { select: { name: true, minStock: true } } }
    });

    const lowStockItems = branchStocks
      .filter(bs => bs.quantity <= bs.product.minStock)
      .map(bs => ({
        productId: bs.productId,
        name: bs.product.name,
        quantity: bs.quantity,
        minStock: bs.product.minStock
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

    const stocks = await prisma.branchStock.findMany({
      where: branchId ? { branchId: String(branchId) } : {},
      include: { product: true }
    });

    const totalStockValue = stocks.reduce((acc, stock) => acc + (stock.quantity * stock.product.price), 0);

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
