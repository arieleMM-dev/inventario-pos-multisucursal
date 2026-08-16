import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = async (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
  subClient.on('error', (err) => console.error('Redis Sub Client Error', err));

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Adaptador de Redis para Socket.io conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando Redis para Socket.io:', error);
  }

  // Middleware de autenticación para sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
      (socket as any).user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Cliente solicita unirse a una sala (sucursal)
    socket.on('join-branch', (data: { branchId: string }) => {
      const { branchId } = data;
      const user = (socket as any).user;

      // Validación básica de seguridad (BR-09, BR-10 aplicados a sockets)
      if (user.role !== 'ADMIN' && user.branchId !== branchId) {
        console.warn(`Intento no autorizado del usuario ${user.userId} de unirse a la sala branch:${branchId}`);
        return; 
      }

      socket.join(`branch:${branchId}`);
      console.log(`Socket ${socket.id} (Usuario: ${user.userId}) se unió a branch:${branchId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no está inicializado. Asegúrate de llamar a initSocket primero.');
  }
  return io;
};
