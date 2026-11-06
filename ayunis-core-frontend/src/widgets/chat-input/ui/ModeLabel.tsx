import { cn } from '@ayunis/ui/lib/cn';
import { ModelModeIcon, type ModelMode } from '@/widgets/model-select-options';

interface ModeLabelProps {
  mode: ModelMode;
  label: string;
  className?: string;
  withShimmer?: boolean;
}

export function ModeLabel({
  mode,
  label,
  className,
  withShimmer = false,
}: Readonly<ModeLabelProps>) {
  const content = (
    <>
      <ModelModeIcon mode={mode} className="max-mode-item__icon" />
      <span className="max-mode-item__label truncate">{label}</span>
    </>
  );

  return (
    <span
      className={cn('relative inline-flex min-w-0 items-center', className)}
    >
      {content}
      {withShimmer && mode === 'max' && (
        <span className="max-shimmer__glint" aria-hidden="true">
          {content}
        </span>
      )}
    </span>
  );
}
