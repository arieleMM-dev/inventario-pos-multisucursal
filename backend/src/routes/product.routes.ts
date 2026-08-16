import { Router } from 'express';
import { getProducts, createProduct, getProductStock, adjustStock } from '../controllers/product.controller';
import { requireAuth, requirePermission, requireBranchAccess } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint para crear productos: Solo permitido para el rol ADMIN
router.post('/', requireAuth, requirePermission('inventory.create_product'), createProduct);

// Endpoint para consultar el catálogo general.
// Requiere branchId (lo valida requireBranchAccess según BR-09, BR-10)
router.get('/', requireAuth, requireBranchAccess, getProducts);

// Endpoint para consultar el stock de un producto específico en una sucursal
router.get('/:id/stock', requireAuth, requireBranchAccess, getProductStock);

// Endpoint para realizar un ajuste manual de stock
router.post('/:id/adjust', requireAuth, requireBranchAccess, adjustStock);

export default router;
