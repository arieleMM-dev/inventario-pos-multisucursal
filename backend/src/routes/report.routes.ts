import { Router } from 'express';
import { getRotationReport, getLowStockReport } from '../controllers/report.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Los reportes en principio los ven ENCARGADO y ADMIN (BR-10, BR-11)
// Admin puede ver todas las sucursales, Encargado solo la suya (validado en el controller si quisiéramos, pero por ahora en la UI)
router.get('/rotation', requireAuth, requirePermission('reports.view'), getRotationReport);
router.get('/low-stock', requireAuth, requirePermission('reports.view'), getLowStockReport);

export default router;
