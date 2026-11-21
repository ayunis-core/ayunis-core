import type { LucideIcon } from 'lucide-react';

export interface EmptyStateStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface EmptyStateStepsProps {
  steps: readonly EmptyStateStep[];
}

export function EmptyStateSteps({ steps }: Readonly<EmptyStateStepsProps>) {
  return (
    <ol className="mb-8 grid w-full gap-3 text-left sm:grid-cols-3">
      {steps.map(({ icon: Icon, title, description }, index) => (
        <li
          key={title}
          className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="size-4" />
            </span>
            <p className="text-sm font-medium">
              <span className="text-muted-foreground tabular-nums">
                {index + 1}.
              </span>{' '}
              {title}
            </p>
          </div>
          <p className="text-xs/relaxed text-muted-foreground">{description}</p>
        </li>
      ))}
    </ol>
  );
}
