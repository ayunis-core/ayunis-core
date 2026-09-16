import type { ReactNode } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import './processing-glow.css';

interface ProcessingGlowProps {
  isActive: boolean;
  className?: string;
  children: ReactNode;
}

export function ProcessingGlow({
  isActive,
  className,
  children,
}: Readonly<ProcessingGlowProps>) {
  return (
    <div
      className={cn(
        'processing-glow',
        isActive && 'processing-glow--active',
        className,
      )}
    >
      <div className="processing-glow__card">{children}</div>
    </div>
  );
}
