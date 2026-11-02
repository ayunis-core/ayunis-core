import { Atom } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type { ModelMode } from '@/widgets/model-select-options/lib/model-modes';
import { AycWordmark } from './AycWordmark';

interface ModelModeIconProps {
  mode: ModelMode;
  className?: string;
}

export default function ModelModeIcon({
  mode,
  className,
}: Readonly<ModelModeIconProps>) {
  return (
    <span
      className={cn(
        'inline-flex w-5 shrink-0 items-center justify-center text-brand',
        className,
      )}
    >
      {mode === 'auto' ? (
        <AycWordmark
          className="shrink-0 text-current"
          style={{
            width: '1.25rem',
            height: '0.72rem',
            transform: 'translateY(0.05rem)',
          }}
        />
      ) : (
        <Atom aria-hidden="true" className="size-4 shrink-0 text-current" />
      )}
    </span>
  );
}
