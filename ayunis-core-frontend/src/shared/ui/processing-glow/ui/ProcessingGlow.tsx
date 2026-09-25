import type { ReactNode } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import './processing-glow.css';

interface ProcessingGlowProps {
  isActive: boolean;
  children: ReactNode;
}

export function ProcessingGlow({
  isActive,
  children,
}: Readonly<ProcessingGlowProps>) {
  return (
    <div
      className={cn('processing-glow', isActive && 'processing-glow--active')}
    >
      <div className="processing-glow__card">{children}</div>
    </div>
  );
}
