import { Router } from 'express';
import { createSale } from '../controllers/sale.controller';
import { requireAuth, requireBranchAccess } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint para procesar ventas (Cajeros, Encargados, Admin)
// Protegido por autenticación y revisión de permisos de sucursal
router.post('/', requireAuth, requireBranchAccess, createSale);

export default router;
