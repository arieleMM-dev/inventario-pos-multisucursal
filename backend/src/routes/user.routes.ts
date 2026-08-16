import { Router } from 'express';
import { getUsers, createUser, updateUser } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Todo el CRUD de usuarios requiere rol ADMIN
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
