import { Router } from 'express';
import { getCategories, getCategoriesTree, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('INVENTORY_VIEW'), getCategories);
router.get('/tree', requirePermission('INVENTORY_VIEW'), getCategoriesTree);
router.post('/', requirePermission('INVENTORY_CREATE_PRODUCT'), createCategory);
router.put('/:id', requirePermission('INVENTORY_CREATE_PRODUCT'), updateCategory);
router.delete('/:id', requirePermission('INVENTORY_DELETE'), deleteCategory);

export default router;
