import { ChevronRight, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/shared/ui/shadcn/progress';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useMe } from '../api/useMe';
import { useHideOnboarding } from '../api/useHideOnboarding';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useOnboarding, useOnboardingProgress } from '@/widgets/onboarding';

export function OnboardingCard() {
  const { t } = useTranslation('common');
  const { user } = useMe();
  const isAdmin = user?.role === MeResponseDtoRole.admin;
  const { completedStepIds, hidden, isLoading } = useOnboarding();
  const { progressPercent } = useOnboardingProgress(isAdmin, completedStepIds);
  const { hideOnboarding } = useHideOnboarding();
  const { confirm } = useConfirmation();

  if (isLoading || hidden || progressPercent >= 100) {
    return null;
  }

  const handleHideClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    confirm({
      title: t('sidebar.hideGettingStartedConfirm.title'),
      description: t('sidebar.hideGettingStartedConfirm.description'),
      confirmText: t('sidebar.hideGettingStartedConfirm.confirmText'),
      cancelText: t('sidebar.hideGettingStartedConfirm.cancelText'),
      onConfirm: () => {
        hideOnboarding(completedStepIds);
      },
    });
  };

  return (
    <Link
      to="/getting-started"
      className="group relative flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
    >
      <button
        type="button"
        aria-label={t('sidebar.hideGettingStarted')}
        onClick={handleHideClick}
        className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <X className="size-3" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {t('sidebar.gettingStarted')}
          </span>
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Progress value={progressPercent} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>
      </div>
    </Link>
  );
}
