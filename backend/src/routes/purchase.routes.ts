import { Router } from 'express';
import { createPurchaseOrder, updatePurchaseOrderStatus } from '../controllers/purchase.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', requireAuth, requireRole(['ENCARGADO', 'ADMIN']), createPurchaseOrder);
router.patch('/:id/status', requireAuth, requireRole(['ENCARGADO', 'ADMIN']), updatePurchaseOrderStatus);

export default router;
