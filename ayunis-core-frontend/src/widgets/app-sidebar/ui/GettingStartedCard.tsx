import { ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/shared/ui/shadcn/progress';
import { useMe } from '../api/useMe';
import { MeResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { GETTING_STARTED_CATEGORIES } from '@/shared/lib/getting-started/categories';
import { useCompletedSteps } from '@/shared/lib/getting-started-storage';

export function GettingStartedCard() {
  const { t } = useTranslation('common');
  const { user } = useMe();
  const completedSteps = useCompletedSteps();

  const isAdmin = user?.role === MeResponseDtoRole.admin;

  const categories = GETTING_STARTED_CATEGORIES.filter(
    (cat) => !cat.adminOnly || isAdmin,
  );

  const totalSteps = categories.reduce((sum, cat) => sum + cat.steps.length, 0);
  const completedCount = categories.reduce(
    (sum, cat) =>
      sum + cat.steps.filter((s) => completedSteps.has(s.id)).length,
    0,
  );
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (progressPercent >= 100) {
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
