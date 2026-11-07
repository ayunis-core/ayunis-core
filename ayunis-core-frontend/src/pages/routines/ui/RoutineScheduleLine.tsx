import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { formatRunTime } from '@/pages/routines/lib/format-run-time';
import type { Routine } from '@/pages/routines/model/openapi';

export function RoutineScheduleLine({
  routine,
}: Readonly<{ routine: Routine }>) {
  const { t } = useTranslation('routines');

  if (routine.pausedAt) {
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1.5"
        data-testid="routine-paused"
      >
        <Badge variant="destructive">{t('schedule.paused')}</Badge>
        <span className="text-muted-foreground">
          {t('schedule.pausedHint')}
        </span>
      </span>
    );
  }
  if (!routine.enabled || !routine.nextRunAt) return null;
  return (
    <span className="text-muted-foreground" data-testid="routine-next-run">
      {t('schedule.nextRun', { time: formatRunTime(routine.nextRunAt) })}
    </span>
  );
}
