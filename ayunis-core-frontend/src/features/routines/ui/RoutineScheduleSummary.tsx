import { useTranslation } from 'react-i18next';
import { describeRoutineSchedule } from '@/features/routines/lib/routine-schedule';
import type { RoutineSchedule } from '@/features/routines/model/openapi';

export function RoutineScheduleSummary({
  schedule,
  className,
}: Readonly<{ schedule: RoutineSchedule; className?: string }>) {
  const { t } = useTranslation('routines');
  return (
    <span className={className} data-testid="routine-schedule-summary">
      {describeRoutineSchedule(schedule, t)}
    </span>
  );
}
