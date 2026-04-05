'use client';

import { AIAssistantProvider } from '@/components/dma/AIAssistantProvider';
import { AIFloatingButton } from '@/components/dma/AIFloatingButton';
import { ReactNode } from 'react';

export function DMAWrapper({ children }: { children: ReactNode }) {
  return (
    <AIAssistantProvider>
      {children}
      <AIFloatingButton />
    </AIAssistantProvider>
  );
}