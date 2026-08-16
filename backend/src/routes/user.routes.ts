import { Router } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/user.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Todo el CRUD de usuarios requiere rol ADMIN
router.use(requireAuth, requirePermission('users.manage'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
