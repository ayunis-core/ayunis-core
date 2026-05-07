import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Progress } from '@/shared/ui/shadcn/progress';
import { cn } from '@/shared/lib/shadcn/utils';
import type { GettingStartedCategory } from '@/shared/lib/getting-started/types';
import StepItem from './StepItem';

interface CategoryCardProps {
  category: GettingStartedCategory;
  completedSteps: Set<string>;
  onCompleteStep: (stepId: string) => void;
  defaultExpanded?: boolean;
}

export default function CategoryCard({
  category,
  completedSteps,
  onCompleteStep,
  defaultExpanded = false,
}: Readonly<CategoryCardProps>) {
  const { t } = useTranslation('getting-started');
  const [expanded, setExpanded] = useState(defaultExpanded);

  const firstIncompleteStepIndex = category.steps.findIndex(
    (s) => !completedSteps.has(s.id),
  );
  const completedCount = category.steps.filter((s) =>
    completedSteps.has(s.id),
  ).length;
  const totalCount = category.steps.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="border rounded-xl bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-4 w-full px-5 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-sm">
              {t(`categories.${category.translationKey}.title`)}
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCount} / {totalCount}
            </span>
          </div>
          <Progress value={progressPercent} className="mt-1.5 h-1" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round(progressPercent)}%
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform shrink-0',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-3">
          {category.helpUrl && (
            <div className="pb-2.5 mb-1 border-b border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`categories.${category.translationKey}.description`)}{' '}
                <a
                  href={category.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t(`categories.${category.translationKey}.helpLink`)}
                  <ExternalLink className="size-3" />
                </a>
              </p>
            </div>
          )}
          <div className="divide-y divide-border/50">
            {category.steps.map((step, index) => (
              <StepItem
                key={step.id}
                step={step}
                completed={completedSteps.has(step.id)}
                locked={
                  !completedSteps.has(step.id) &&
                  !!step.dependsOn &&
                  !completedSteps.has(step.dependsOn)
                }
                defaultExpanded={
                  defaultExpanded && index === firstIncompleteStepIndex
                }
                onComplete={onCompleteStep}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
