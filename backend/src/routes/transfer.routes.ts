import { Router } from 'express';
import { createTransfer, updateTransferStatus, getTransfers } from '../controllers/transfer.controller';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Los permisos específicos de cada sucursal se verifican en el controlador (BR-06)
// porque la lógica depende si actúan como ORIGEN o DESTINO,
// por tanto requireRole filtra para excluir a CAJERO.

router.get('/', requireAuth, getTransfers);
router.post('/', requireAuth, requirePermission('transfers.create'), createTransfer);
router.patch('/:id/status', requireAuth, requirePermission('transfers.receive'), updateTransferStatus);

export default router;
