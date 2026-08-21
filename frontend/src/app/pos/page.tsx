"use client";

import React, { useState } from 'react';
import { ProductCard } from '@/components/pos/ProductCard';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { usePos } from '@/hooks/usePos';
import { useSocket } from '@/hooks/useSocket';
import { Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PosPage() {
  const { isInitializing, user, selectedBranchId } = useAuth();
  const {
    products,
    isLoading,
    isError,
    error,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    subtotal,
    checkout,
    isCheckingOut
  } = usePos();
  
  // Activa la subscripción a Socket.io
  useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  if (isInitializing) return <div className="p-8">Cargando aplicación...</div>;
  if (!user) return null; // Será redirigido por middleware/layout de autenticación
  
  if (user.role === 'ADMIN' && !selectedBranchId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xl text-[var(--color-gray-500)]">Por favor, seleccione una sucursal en la barra superior para iniciar.</p>
      </div>
    );
  }

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-row w-full bg-[var(--pos-brutal-bg)]">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Search and Filters Bar */}
        <div className="p-4 bg-[var(--pos-brutal-bg)] border-b-4 border-[var(--pos-brutal-fg)] flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--pos-brutal-fg)]" size={20} strokeWidth={2.5} />
            <input 
              type="text" 
              placeholder="BUSCAR POR NOMBRE O SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--pos-brutal-panel)] border-2 border-[var(--pos-brutal-fg)] rounded-none focus:outline-none focus:shadow-[4px_4px_0_0_var(--pos-brutal-fg)] transition-shadow text-[var(--pos-brutal-fg)] font-bold uppercase placeholder:text-[var(--pos-brutal-fg)]/50"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-[var(--color-gray-500)]">
              Cargando catálogo...
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-[var(--color-danger-text)]">
              Error al cargar productos: {(error as any)?.response?.data?.error?.message || (error as Error)?.message}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[var(--color-gray-500)]">
              No se encontraron productos.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onClick={() => addToCart(product)} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <CartPanel 
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        subtotal={subtotal}
        onCheckout={() => setShowPayment(true)}
        isCheckingOut={false} // Disable loading on button, modal handles it
      />

      <PaymentModal 
        open={showPayment}
        onOpenChange={setShowPayment}
        subtotal={subtotal}
        isProcessing={isCheckingOut}
        onConfirm={async (paymentData) => {
          try {
            await checkout(paymentData);
            setShowPayment(false);
          } catch (e) {
            // Error is handled in usePos hook
          }
        }}
      />
    </div>
  );
}
