import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function useSocket() {
  const { token, selectedBranchId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !selectedBranchId) return;

    const socket = getSocket();

    // Actualizar auth con el token
    socket.auth = { token };
    socket.connect();

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      socket.emit('join-branch', { branchId: selectedBranchId });
    });

    socket.on('stock:updated', (data: { productId: string, branchId: string, newQuantity: number, status: string }) => {
      if (data.branchId === selectedBranchId) {
        // Actualizar caché de react-query para productos
        queryClient.setQueryData(['products', selectedBranchId], (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((product: any) => {
            if (product.id === data.productId) {
              return { ...product, stockInBranch: data.newQuantity, status: data.status };
            }
            return product;
          });
        });
      }
    });

    socket.on('stock:low', (data) => {
      // Opcional: Mostrar una notificación de tipo Toast de que el stock es bajo
      console.warn('Stock bajo:', data);
    });

    return () => {
      socket.off('connect');
      socket.off('stock:updated');
      socket.off('stock:low');
      socket.disconnect();
    };
  }, [token, selectedBranchId, queryClient]);
}
