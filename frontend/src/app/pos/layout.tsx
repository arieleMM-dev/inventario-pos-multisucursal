import React from 'react';
import { TopBar } from '@/components/pos/TopBar';
import { CashSessionGuard } from '@/components/pos/CashSessionGuard';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--pos-brutal-bg)] relative">
      <CashSessionGuard>
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </CashSessionGuard>
    </div>
  );
}
