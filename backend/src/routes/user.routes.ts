import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, updateProfile, getUserSessions, changePassword } from '../controllers/user.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint de perfil, requiere auth pero NO requiere USERS_MANAGE
router.patch('/profile', requireAuth, updateProfile);
router.get('/profile/sessions', requireAuth, getUserSessions);
router.post('/profile/password', requireAuth, changePassword);

// Endpoints de gestión, requieren rol admin
const manageMiddleware = requirePermission('USERS_MANAGE');

router.get('/', requireAuth, manageMiddleware, getUsers);
router.post('/', requireAuth, manageMiddleware, createUser);
router.put('/:id', requireAuth, manageMiddleware, updateUser);
router.delete('/:id', requireAuth, manageMiddleware, deleteUser);

export default router;
