import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { EmptyStateGuide } from './EmptyStateGuide';
import { EmptyStateHero } from './EmptyStateHero';
import { EmptyStateSteps, type EmptyStateStep } from './EmptyStateSteps';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  steps?: readonly EmptyStateStep[];
  helpPath?: string;
  suggestions?: ReactNode;
  guide?: ReactNode;
  testId?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  steps,
  helpPath,
  suggestions,
  guide,
  testId,
}: Readonly<EmptyStateProps>) {
  const isExplained = Boolean(steps?.length) || Boolean(guide);

  return (
    <div
      className={cn(
        'mx-auto flex flex-col items-center justify-center px-4 text-center',
        isExplained ? 'w-full max-w-2xl py-12' : 'max-w-md py-16',
      )}
      data-testid={testId}
    >
      {icon && <EmptyStateHero icon={icon} />}
      <h3
        className={cn(
          'mb-2 font-semibold',
          isExplained ? 'text-2xl tracking-tight' : 'text-lg',
        )}
      >
        {title}
      </h3>
      <p className="mb-6 max-w-md text-balance text-muted-foreground">
        {description}
      </p>
      {steps && steps.length > 0 && <EmptyStateSteps steps={steps} />}
      <EmptyStateGuide
        action={action}
        helpPath={helpPath}
        suggestions={suggestions}
        guide={guide}
      />
    </div>
  );
}
