import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';

export function ScreenShell({
  title,
  hint,
  children,
  nextLabel = 'Weiter',
  nextDisabled = false,
  secondary,
  onNext,
  onBack,
}: Readonly<{
  title: string;
  hint?: string;
  children?: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  secondary?: { label: string; onClick: () => void };
  onNext: () => void;
  onBack?: () => void;
}>) {
  return (
    <section className="wp-flow">
      <div className="wp-flow__question">
        <h2 className="wp-flow__title">{title}</h2>
        {hint && <p className="wp-flow__hint">{hint}</p>}
        {children && <div className="wp-flow__body">{children}</div>}
      </div>
      <div className="wp-flow__nav">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            Zurück
          </Button>
        )}
        {secondary && (
          <Button variant="ghost" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
        <Button disabled={nextDisabled} onClick={onNext}>
          {nextLabel}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
