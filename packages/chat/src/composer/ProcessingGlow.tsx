import type { ComponentProps } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import './processing-glow.css';

interface ProcessingGlowProps extends ComponentProps<'div'> {
  isActive: boolean;
}

export function ProcessingGlow({
  isActive,
  className,
  children,
  ...rest
}: Readonly<ProcessingGlowProps>) {
  return (
    <div
      {...rest}
      className={cn(
        'processing-glow',
        isActive && 'processing-glow--active',
        className,
      )}
    >
      {isActive && (
        <div className="processing-glow__light" aria-hidden="true">
          <div className="processing-glow__spinner">
            <div className="processing-glow__arc" />
            <div className="processing-glow__bloom" />
          </div>
        </div>
      )}
      <div className="processing-glow__content">{children}</div>
    </div>
  );
}
