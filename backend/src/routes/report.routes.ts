import { Router } from 'express';
import { getRotationReport, getLowStockReport } from '../controllers/report.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Los reportes en principio los ven ENCARGADO y ADMIN (BR-10, BR-11)
// Admin puede ver todas las sucursales, Encargado solo la suya (validado en el controller si quisiéramos, pero por ahora en la UI)
router.get('/rotation', requireAuth, requireRole(['ENCARGADO', 'ADMIN']), getRotationReport);
router.get('/low-stock', requireAuth, requireRole(['ENCARGADO', 'ADMIN']), getLowStockReport);

export default router;
