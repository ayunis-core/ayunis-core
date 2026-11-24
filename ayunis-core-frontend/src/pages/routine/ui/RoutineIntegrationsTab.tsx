import { useTranslation } from 'react-i18next';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  useRoutineIntegrations,
  useToggleRoutineIntegration,
} from '@/pages/routine/api/useRoutineIntegrations';
import {
  canToggleIntegration,
  routineIntegrationOptions,
  type RoutineIntegrationOption,
} from '@/pages/routine/lib/routine-integration-options';
import { RoutineContextList } from './RoutineContextList';

export function RoutineIntegrationsTab({
  routineId,
}: Readonly<{ routineId: string }>) {
  const { t } = useTranslation('routines');
  const data = useRoutineIntegrations(routineId);
  const toggle = useToggleRoutineIntegration(
    routineId,
    data.availableIntegrations,
  );
  const assignedIds = data.assignedIds ?? [];
  const options =
    routineIntegrationOptions(data.availableIntegrations, assignedIds) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('detail.context.integrationsDescription')}
      </p>
      <RoutineContextList
        isLoading={data.isLoading}
        isError={data.isError}
        onRetry={data.refetch}
        emptyText={t('detail.context.integrationsEmpty')}
        rows={options.map((option) => ({
          id: option.id,
          title: option.name ?? t('form.integrationUnavailable'),
          control: (
            <IntegrationSwitch
              option={option}
              selected={assignedIds.includes(option.id)}
              disabled={toggle.isPending}
              onToggle={(on) => toggle.mutate({ integrationId: option.id, on })}
            />
          ),
        }))}
      />
    </div>
  );
}

function IntegrationSwitch({
  option,
  selected,
  disabled,
  onToggle,
}: Readonly<{
  option: RoutineIntegrationOption;
  selected: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
}>) {
  const { t } = useTranslation('routines');
  const { t: tCommon } = useTranslation('common');
  const locked = !canToggleIntegration(option, selected);
  const control = (
    <Switch
      checked={selected}
      onCheckedChange={onToggle}
      disabled={disabled || locked}
      aria-label={t('detail.context.toggleAriaLabel', {
        name: option.name ?? t('form.integrationUnavailable'),
      })}
      data-testid={`routine-integration-${option.id}`}
    />
  );
  if (!locked) return control;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent>
        {tCommon('chatInput.integrationNotAuthorized')}
      </TooltipContent>
    </Tooltip>
  );
}
