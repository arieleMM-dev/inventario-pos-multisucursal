import { Router } from 'express';
import { getBranches, createBranch, updateBranch } from '../controllers/branch.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getBranches);
router.post('/', requireAuth, requireRole(['ADMIN']), createBranch);
router.put('/:id', requireAuth, requireRole(['ADMIN']), updateBranch);

export default router;
