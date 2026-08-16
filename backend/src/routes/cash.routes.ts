import { Router } from 'express';
import { getCurrentSession, openSession, closeSession } from '../controllers/cash.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/current', getCurrentSession);
router.post('/open', openSession);
router.post('/:id/close', closeSession);

export default router;
