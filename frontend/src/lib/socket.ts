import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000'; // Ajustar en producción

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false, // Conectar manualmente después de obtener el token
    });
  }
  return socketInstance;
};
