import { Router } from 'express';
import { createPurchaseOrder, updatePurchaseOrderStatus } from '../controllers/purchase.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', requireAuth, requirePermission('INVENTORY_CREATE_PRODUCT'), createPurchaseOrder);
router.patch('/:id/status', requireAuth, requirePermission('INVENTORY_CREATE_PRODUCT'), updatePurchaseOrderStatus);

export default router;
