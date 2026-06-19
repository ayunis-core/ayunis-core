import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Info, PartyPopper } from 'lucide-react';
import { Progress } from '@/shared/ui/shadcn/progress';
import { Button } from '@/shared/ui/shadcn/button';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { showSuccess } from '@/shared/lib/toast';
import {
  clearPendingStep,
  useOnboardingProgress,
  useUpdateOnboarding,
} from '@/features/onboarding-progress';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
import CenteredContentLayout from '@/layouts/centered-content-layout/ui/CenteredContentLayout';
import OnboardingCategoryCard from './OnboardingCategoryCard';

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

interface Props {
  showHideOption?: boolean;
  showRestoreOption?: boolean;
}

export default function OnboardingContent({
  showHideOption = false,
  showRestoreOption = false,
}: Readonly<Props>) {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const { user } = useMe();
  const isAdmin = user?.role === MeResponseDtoRole.admin;
  const hidden = user?.onboardingHidden ?? false;
  const completedStepIds = user?.onboardingCompletedStepIds ?? [];
  const { updateOnboarding } = useUpdateOnboarding();
  const {
    visibleCategories,
    totalSteps,
    completedCount,
    overallProgress,
    firstIncompleteCategoryIndex,
    completedSteps,
  } = useOnboardingProgress(isAdmin, completedStepIds);

  const milestone = getMilestoneMessage(overallProgress, t);

  const handleToggleStep = useCallback(
    (stepId: string) => {
      const next = new Set(completedSteps);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
        showSuccess(t('stepCompleted'));
      }
      updateOnboarding({ completedStepIds: [...next], hidden });
    },
    [completedSteps, hidden, updateOnboarding, t],
  );

  useEffect(() => {
    clearPendingStep();
  }, []);

  const isAllComplete = overallProgress >= 100;

  return (
    <CenteredContentLayout>
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
          <OnboardingCategoryCard
            key={category.id}
            category={category}
            completedSteps={completedSteps}
            onCompleteStep={handleToggleStep}
            defaultExpanded={index === firstIncompleteCategoryIndex}
          />
        ))}
      </div>

      {showHideOption && (
        <div className="text-center pt-2 pb-4 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              updateOnboarding({ completedStepIds: [...completedSteps], hidden: true });
              void navigate({ to: '/chat' });
            }}
          >
            <EyeOff className="size-3.5" />
            {t('page.hide')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('page.hideHint')}</p>
        </div>
      )}

      {showRestoreOption && hidden && (
        <div className="text-center pt-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              updateOnboarding({ completedStepIds: [...completedSteps], hidden: false })
            }
          >
            <Eye className="size-3.5" />
            {t('page.show')}
          </Button>
        </div>
      )}
    </CenteredContentLayout>
  );
}
