import { Router } from 'express';
import { getRoles, getPermissions, createRole, updateRole } from '../controllers/role.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requirePermission('roles.manage'));

router.get('/', getRoles);
router.get('/permissions', getPermissions);
router.post('/', createRole);
router.put('/:id', updateRole);

export default router;
