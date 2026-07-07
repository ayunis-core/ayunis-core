import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Info, PartyPopper } from 'lucide-react';
import { Progress } from '@/shared/ui/shadcn/progress';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useOnboarding, useOnboardingProgress } from '@/widgets/onboarding';
import { useUpdateOnboarding } from '../api/useUpdateOnboarding';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
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

export default function OnboardingContent() {
  const { t } = useTranslation('getting-started');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const { user } = useMe();
  const isAdmin = user?.role === MeResponseDtoRole.admin;
  const {
    completedStepIds,
    hidden,
    isLoading: isOnboardingLoading,
  } = useOnboarding();
  const { updateOnboarding, isLoading } = useUpdateOnboarding();
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
      }
      updateOnboarding({ completedStepIds: [...next], hidden });
    },
    [completedSteps, hidden, updateOnboarding],
  );

  const handleToggleHidden = () => {
    if (hidden) {
      updateOnboarding({ completedStepIds, hidden: false });
      return;
    }

    confirm({
      title: tCommon('sidebar.hideGettingStartedConfirm.title'),
      description: tCommon('sidebar.hideGettingStartedConfirm.description'),
      confirmText: tCommon('sidebar.hideGettingStartedConfirm.confirmText'),
      cancelText: tCommon('sidebar.hideGettingStartedConfirm.cancelText'),
      onConfirm: () => {
        updateOnboarding({ completedStepIds, hidden: true });
        void navigate({ to: '/chat' });
      },
    });
  };

  const isAllComplete = overallProgress >= 100;

  if (isOnboardingLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src={brandIconDark}
              alt="Ayunis"
              className="size-14 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold">{t('page.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('page.description')}
          </p>
          <Skeleton className="h-2 max-w-xs mx-auto" />
        </div>
        <div className="space-y-3">
          {visibleCategories.map((category) => (
            <Skeleton key={category.id} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
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

      <div className="text-center pt-2 pb-4 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={isLoading}
          onClick={handleToggleHidden}
        >
          {hidden ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
          {hidden ? t('page.show') : t('page.hide')}
        </Button>
        {!hidden && (
          <p className="text-xs text-muted-foreground">{t('page.hideHint')}</p>
        )}
      </div>
    </div>
  );
}
