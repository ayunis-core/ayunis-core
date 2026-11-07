import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { failureReasonKey } from '@/features/routines/lib/failure-reason';
import { formatRunTime } from '@/features/routines/lib/format-run-time';
import type { Routine } from '@/features/routines/model/openapi';
import { RoutineRunStatus } from '@/features/routines/model/openapi';

export function RoutineRunStatusLine({
  routine,
}: Readonly<{ routine: Routine }>) {
  const { t } = useTranslation('routines');
  const status = routine.lastRunStatus;

  if (status === null) {
    return (
      <span className="text-muted-foreground" data-testid="routine-status">
        {t('status.never')}
      </span>
    );
  }
  if (
    status === RoutineRunStatus.queued ||
    status === RoutineRunStatus.running
  ) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-muted-foreground"
        data-testid="routine-status"
        data-status={status}
      >
        <Loader2 className="size-3.5 animate-spin" />
        {t(`status.${status}`)}
      </span>
    );
  }
  const failed = status === RoutineRunStatus.failed;
  const explained = failed || status === RoutineRunStatus.skipped;
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5"
      data-testid="routine-status"
      data-status={status}
    >
      <Badge variant={failed ? 'destructive' : 'secondary'}>
        {t(`status.${status}`)}
      </Badge>
      {routine.lastRunAt && (
        <span className="text-muted-foreground">
          {formatRunTime(routine.lastRunAt)}
        </span>
      )}
      {explained && (
        <span className="text-muted-foreground">
          {t(failureReasonKey(routine.lastRunFailureReason))}
        </span>
      )}
    </span>
  );
}
