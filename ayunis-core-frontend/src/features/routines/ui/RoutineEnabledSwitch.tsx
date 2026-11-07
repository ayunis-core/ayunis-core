import { useTranslation } from 'react-i18next';
import { Switch } from '@ayunis/ui/components/switch';
import { useUpdateRoutine } from '@/features/routines/api/useUpdateRoutine';
import type { Routine } from '@/features/routines/model/openapi';

interface RoutineEnabledSwitchProps {
  routine: Routine;
  testId: string;
}

export function RoutineEnabledSwitch({
  routine,
  testId,
}: Readonly<RoutineEnabledSwitchProps>) {
  const { t } = useTranslation('routines');
  const { updateRoutine, isUpdating } = useUpdateRoutine();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {routine.enabled ? t('card.enabled') : t('card.disabled')}
      </span>
      <Switch
        checked={routine.enabled}
        onCheckedChange={(enabled) => updateRoutine(routine.id, { enabled })}
        disabled={isUpdating}
        aria-label={t('card.enabledLabel')}
        data-testid={testId}
      />
    </div>
  );
}
