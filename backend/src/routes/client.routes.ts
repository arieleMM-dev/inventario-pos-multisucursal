import { Router } from 'express';
import { getClients, createClient } from '../controllers/client.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getClients);
router.post('/', createClient);

export default router;
