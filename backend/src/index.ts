import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import transferRoutes from './routes/transfer.routes';
import purchaseRoutes from './routes/purchase.routes';
import reportRoutes from './routes/report.routes';
import branchRoutes from './routes/branch.routes';
import userRoutes from './routes/user.routes';
import clientRoutes from './routes/client.routes';
import cashRoutes from './routes/cash.routes';

const app = express();

// Configuración de middlewares globales
app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cash-sessions', cashRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/reports', reportRoutes);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
});

import { createServer } from 'http';
import { initSocket } from './utils/socket';

const PORT = process.env.PORT || 4000;

// Crear servidor HTTP explícito para montar Socket.io
const httpServer = createServer(app);

if (process.env.NODE_ENV !== 'test') {
  // Inicializamos Redis y Socket.io antes de arrancar a escuchar peticiones HTTP
  initSocket(httpServer).then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Servidor del backend ejecutándose en el puerto ${PORT} 🚀`);
    });
  });
}

export default app;
