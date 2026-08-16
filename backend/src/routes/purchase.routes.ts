import { Router } from 'express';
import { createPurchaseOrder, updatePurchaseOrderStatus } from '../controllers/purchase.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', requireAuth, requirePermission('inventory.create_product'), createPurchaseOrder);
router.patch('/:id/status', requireAuth, requirePermission('inventory.create_product'), updatePurchaseOrderStatus);

export default router;
