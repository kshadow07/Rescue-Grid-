'use client';

import { AIAssistantProvider } from '@/components/dma/AIAssistantProvider';
import { ReactNode } from 'react';

export function DMAWrapper({ children }: { children: ReactNode }) {
  return (
    <AIAssistantProvider>
      {children}
    </AIAssistantProvider>
  );
}