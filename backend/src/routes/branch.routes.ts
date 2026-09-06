import { Router } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branch.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getBranches);
router.post('/', requireAuth, requirePermission('BRANCHES_MANAGE'), createBranch);
router.put('/:id', requireAuth, requirePermission('BRANCHES_MANAGE'), updateBranch);
router.delete('/:id', requireAuth, requirePermission('BRANCHES_MANAGE'), deleteBranch);

export default router;
