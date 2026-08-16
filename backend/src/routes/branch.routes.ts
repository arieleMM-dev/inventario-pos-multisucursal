import { Router } from 'express';
import { getBranches, createBranch, updateBranch } from '../controllers/branch.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getBranches);
router.post('/', requireAuth, requirePermission('branches.manage'), createBranch);
router.put('/:id', requireAuth, requirePermission('branches.manage'), updateBranch);

export default router;
