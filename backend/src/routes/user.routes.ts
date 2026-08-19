import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, updateProfile } from '../controllers/user.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint de perfil, requiere auth pero NO requiere users.manage
router.patch('/profile', requireAuth, updateProfile);

// Endpoints de gestión, requieren rol admin
const manageMiddleware = requirePermission('users.manage');

router.get('/', requireAuth, manageMiddleware, getUsers);
router.post('/', requireAuth, manageMiddleware, createUser);
router.put('/:id', requireAuth, manageMiddleware, updateUser);
router.delete('/:id', requireAuth, manageMiddleware, deleteUser);

export default router;
