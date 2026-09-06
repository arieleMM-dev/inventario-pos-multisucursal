import { Router } from 'express';
import { getRoles, createRole, updateRole, getPermissions, assignUsersToRole, deleteRole } from '../controllers/role.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requirePermission('ROLES_MANAGE'));

router.get('/', getRoles);
router.get('/permissions', getPermissions);
router.post('/', createRole);
router.put('/:id', updateRole);
router.post('/:id/assign', assignUsersToRole);
router.delete('/:id', deleteRole);

export default router;
