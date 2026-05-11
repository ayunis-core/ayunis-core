import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, PartyPopper } from 'lucide-react';
import { Progress } from '@/shared/ui/shadcn/progress';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { GETTING_STARTED_CATEGORIES } from '@/shared/lib/getting-started/categories';
import { COMPLETED_STEPS_STORAGE_KEY } from '@/shared/lib/getting-started/constants';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { showSuccess } from '@/shared/lib/toast';
import {
  clearPendingStep,
  notifyCompletedStepsChanged,
} from '@/shared/lib/getting-started-storage';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
import CategoryCard from './CategoryCard';

function loadCompleted(): Set<string> {
  try {
    const stored = localStorage.getItem(COMPLETED_STEPS_STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {
    // ignore
  }
  return new Set<string>();
}

function saveCompleted(completed: Set<string>) {
  localStorage.setItem(
    COMPLETED_STEPS_STORAGE_KEY,
    JSON.stringify([...completed]),
  );
  notifyCompletedStepsChanged();
}

function getMilestoneMessage(
  percent: number,
  t: (key: string) => string,
): string | null {
  if (percent >= 100) return t('milestones.complete');
  if (percent >= 75) return t('milestones.almostDone');
  if (percent >= 50) return t('milestones.halfWay');
  if (percent >= 25) return t('milestones.goodStart');
  return null;
}

export default function GettingStartedContent() {
  const { t } = useTranslation('getting-started');
  const { user } = useMe();
  const [completedSteps, setCompletedSteps] = useState(loadCompleted);

  const isAdmin = user?.role === MeResponseDtoRole.admin;

  const visibleCategories = useMemo(
    () => GETTING_STARTED_CATEGORIES.filter((cat) => !cat.adminOnly || isAdmin),
    [isAdmin],
  );

  const totalSteps = visibleCategories.reduce(
    (sum, cat) => sum + cat.steps.length,
    0,
  );
  const completedCount = visibleCategories.reduce(
    (sum, cat) =>
      sum + cat.steps.filter((s) => completedSteps.has(s.id)).length,
    0,
  );
  const overallProgress =
    totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const firstIncompleteCategoryIndex = visibleCategories.findIndex((cat) =>
    cat.steps.some((s) => !completedSteps.has(s.id)),
  );

  const milestone = getMilestoneMessage(overallProgress, t);

  const handleToggleStep = useCallback(
    (stepId: string) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        if (next.has(stepId)) {
          next.delete(stepId);
        } else {
          next.add(stepId);
          showSuccess(t('stepCompleted'));
        }
        saveCompleted(next);
        return next;
      });
    },
    [t],
  );

  useEffect(() => {
    clearPendingStep();
  }, []);

  const isAllComplete = overallProgress >= 100;

  return (
    <div className="relative z-10 max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          <img
            src={brandIconDark}
            alt="Ayunis"
            className="size-14 rounded-2xl shadow-lg"
          />
        </div>
        <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('page.description')}</p>
        <div className="flex items-center gap-3 max-w-xs mx-auto">
          <Progress value={overallProgress} className="flex-1" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t('progress.completed', {
              count: completedCount,
              total: totalSteps,
            })}
          </span>
        </div>
        {milestone && (
          <p className="text-sm font-medium text-primary flex items-center justify-center gap-1.5">
            {isAllComplete && <PartyPopper className="size-4" />}
            {milestone}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t('page.checkboxHint')}</AlertDescription>
        </Alert>
        {visibleCategories.map((category, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            completedSteps={completedSteps}
            onCompleteStep={handleToggleStep}
            defaultExpanded={index === firstIncompleteCategoryIndex}
          />
        ))}
      </div>
    </div>
  );
}
