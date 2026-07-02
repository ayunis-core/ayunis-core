import type { OnboardingCategory } from '@/features/onboarding-progress';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/shadcn/accordion';
import { Progress } from '@/shared/ui/shadcn/progress';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import OnboardingStepItem from './OnboardingStepItem';
import { Card } from '@/shared/ui/shadcn/card';

interface OnboardingCategoryCardProps {
  category: OnboardingCategory;
  completedSteps: Set<string>;
  onCompleteStep: (stepId: string) => void;
  defaultExpanded?: boolean;
}

export default function OnboardingCategoryCard({
  category,
  completedSteps,
  onCompleteStep,
  defaultExpanded = false,
}: Readonly<OnboardingCategoryCardProps>) {
  const { t } = useTranslation('getting-started');

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
    <Card className="py-0 px-4">
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultExpanded ? category.id : undefined}
      >
        <AccordionItem value={category.id}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">
                  {t(`categories.${category.translationKey}.title`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {completedCount} / {totalCount}
                </span>
              </div>
              <Progress value={progressPercent} className="mt-1.5 h-1" />
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {Math.round(progressPercent)}%
            </span>
          </AccordionTrigger>

          <AccordionContent>
            {category.helpPath && (
              <div className="pb-2.5 mb-1 border-b border-border/50">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`categories.${category.translationKey}.description`)}{' '}
                  <a
                    href={getHelpCenterUrl(category.helpPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    {t(`categories.${category.translationKey}.helpLink`)}
                    <ExternalLink className="size-3" />
                  </a>
                </p>
              </div>
            )}
            <div className="divide-y divide-border/50">
              {category.steps.map((step, index) => (
                <OnboardingStepItem
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
