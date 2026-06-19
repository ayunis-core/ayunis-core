import { ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/shared/ui/shadcn/progress';
import { useMe } from '../api/useMe';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useOnboardingProgress } from '@/features/onboarding-progress';

export function OnboardingCard() {
  const { t } = useTranslation('common');
  const { user } = useMe();
  const isAdmin = user?.role === MeResponseDtoRole.admin;
  const hidden = user?.onboardingHidden ?? false;
  const { progressPercent } = useOnboardingProgress(
    isAdmin,
    user?.onboardingCompletedStepIds ?? [],
  );

  if (hidden || progressPercent >= 100) {
    return null;
  }

  return (
    <Link
      to="/getting-started"
      className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
    >
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
