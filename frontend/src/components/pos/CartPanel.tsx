import React from 'react';
import { usePos } from '@/hooks/usePos';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartPanelProps {
  cart: ReturnType<typeof usePos>['cart'];
  updateQuantity: ReturnType<typeof usePos>['updateQuantity'];
  removeFromCart: ReturnType<typeof usePos>['removeFromCart'];
  subtotal: number;
  onCheckout: () => void;
  isCheckingOut: boolean;
}

export function CartPanel({ cart, updateQuantity, removeFromCart, subtotal, onCheckout, isCheckingOut }: CartPanelProps) {
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });

  return (
    <div className="w-[380px] bg-white flex flex-col h-full shadow-lg border-l border-[var(--color-gray-200)] z-10">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)]">
        <h2 className="text-xl font-semibold text-[var(--color-gray-900)]">Carrito ({cart.length})</h2>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-gray-500)]">
            <p>El carrito está vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 p-3 border border-[var(--color-gray-200)] rounded-lg bg-[var(--color-gray-50)]">
              <div className="flex justify-between items-start">
                <span className="font-medium text-[var(--color-gray-900)] leading-tight flex-1 pr-2">{item.name}</span>
                <span className="font-semibold text-[var(--color-brand-500)]">{formatter.format(item.price * item.cartQuantity)}</span>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-3 bg-white rounded-md border border-[var(--color-gray-200)] p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                    className="w-10 h-10 flex items-center justify-center rounded bg-[var(--color-gray-100)] active:bg-[var(--color-gray-200)] text-[var(--color-gray-700)] touch-manipulation"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="w-8 text-center font-medium pos-text-base">{item.cartQuantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded bg-[var(--color-gray-100)] active:bg-[var(--color-gray-200)] text-[var(--color-gray-700)] touch-manipulation"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-3 text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] rounded-md transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout Area */}
      <div className="border-t border-[var(--color-gray-200)] bg-white">
        <div className="p-4 flex justify-between items-center text-[var(--color-gray-700)]">
          <span className="pos-text-base">Subtotal</span>
          <span className="font-semibold">{formatter.format(subtotal)}</span>
        </div>
        
        <div className="p-4 pt-0">
          <button
            onClick={onCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className={`
              w-full h-16 flex items-center justify-between px-6 rounded-xl
              bg-[var(--color-pos-total-bg)] text-white
              ${(cart.length === 0 || isCheckingOut) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] cursor-pointer shadow-md'}
              transition-all
            `}
          >
            <span className="font-medium text-lg">{isCheckingOut ? 'Procesando...' : 'COBRAR'}</span>
            <span className="pos-text-xl font-bold">{formatter.format(subtotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
