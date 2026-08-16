import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  minStock: number;
  stockInBranch: number;
  status: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export function usePos() {
  const { selectedBranchId } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);

  // 1. Obtener productos de la sucursal actual
  const { data: products = [], isLoading, isError, error } = useQuery<Product[]>({
    queryKey: ['products', selectedBranchId],
    queryFn: async () => {
      const { data } = await api.get(`/products?branchId=${selectedBranchId}`);
      return data.data;
    },
    enabled: !!selectedBranchId,
  });

  // 2. Manejo del carrito
  const addToCart = (product: Product) => {
    // Validar stock disponible
    const branchStock = product.stockInBranch;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= branchStock) return prev; // No se puede agregar más del stock
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      if (branchStock <= 0) return prev;
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev => {
      const product = prev.find(p => p.id === productId);
      if (!product) return prev;
      const branchStock = product.stockInBranch;
      if (quantity > branchStock) return prev;
      if (quantity <= 0) return prev.filter(item => item.id !== productId);
      
      return prev.map(item => item.id === productId ? { ...item, cartQuantity: quantity } : item);
    });
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);

  // Mutation para procesar la venta
  const checkoutMutation = useMutation({
    mutationFn: async (paymentData: any = {}) => {
      if (cart.length === 0) throw new Error('El carrito está vacío');
      
      const payload = {
        branchId: selectedBranchId,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.cartQuantity
        })),
        ...paymentData
      };

      const response = await api.post('/sales', payload);
      return response.data;
    },
    onSuccess: () => {
      clearCart();
      // Opcionalmente podemos forzar una recarga, pero Socket.io ya debería actualizar el stock
    }
  });

  return {
    products,
    isLoading,
    isError,
    error,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    checkout: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
  };
}
