import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import type { Routine } from '@/features/routines';
import { RoutineRunStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/** The last run status next to the routine name, visible on every tab. */
export function RoutineRunStatusBadge({
  routine,
}: Readonly<{ routine: Pick<Routine, 'lastRunStatus'> }>) {
  const { t } = useTranslation('routines');
  const status = routine.lastRunStatus;
  const inProgress =
    status === RoutineRunStatus.queued || status === RoutineRunStatus.running;
  const variant =
    status === RoutineRunStatus.failed ? 'destructive' : 'secondary';

  return (
    <Badge
      variant={variant}
      data-testid="routine-header-status"
      data-status={status ?? 'never'}
      data-variant={variant}
    >
      {inProgress && <Loader2 className="animate-spin" />}
      {t(`status.${status ?? 'never'}`)}
    </Badge>
  );
}
