import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { useRunRoutineNow } from '@/features/routines/api/useRunRoutineNow';
import type { Routine } from '@/features/routines/model/openapi';
import { RoutineRunStatus } from '@/features/routines/model/openapi';

interface RoutineRunNowButtonProps {
  routine: Routine;
  testId: string;
}

export function RoutineRunNowButton({
  routine,
  testId,
}: Readonly<RoutineRunNowButtonProps>) {
  const { t } = useTranslation('routines');
  const runNow = useRunRoutineNow();
  const isRunActive =
    routine.lastRunStatus === RoutineRunStatus.queued ||
    routine.lastRunStatus === RoutineRunStatus.running;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => runNow.mutate(routine.id)}
      disabled={runNow.isPending || isRunActive}
      data-testid={testId}
    >
      <Play className="h-4 w-4" />
      {t('card.runNow')}
    </Button>
  );
}
