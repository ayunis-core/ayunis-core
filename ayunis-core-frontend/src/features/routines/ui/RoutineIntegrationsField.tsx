import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@ayunis/ui/components/form';
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useAvailableIntegrations } from '@/features/routines/api/useAvailableIntegrations';
import {
  canToggleIntegration,
  routineIntegrationOptions,
  type RoutineIntegrationOption,
} from '@/features/routines/lib/routine-integration-options';
import type { RoutineFormFields } from '@/features/routines/model/types';

interface RoutineIntegrationsFieldProps {
  form: UseFormReturn<RoutineFormFields>;
  disabled: boolean;
}

/**
 * One switch per integration; hidden while the user has none or the list is
 * loading. Not rendering the switches leaves the stored selection as it is.
 */
export function RoutineIntegrationsField({
  form,
  disabled,
}: Readonly<RoutineIntegrationsFieldProps>) {
  const { t } = useTranslation('routines');
  const { t: tCommon } = useTranslation('common');
  const { integrations, error } = useAvailableIntegrations();

  if (error) {
    return (
      <FormItem className="space-y-0.5 rounded-lg border p-3">
        <FormLabel>{t('form.integrations')}</FormLabel>
        <FormDescription
          className="text-destructive"
          data-testid="routine-form-integrations-error"
        >
          {tCommon('chatInput.integrationsLoadError')}
        </FormDescription>
      </FormItem>
    );
  }

  return (
    <FormField
      control={form.control}
      name="mcpIntegrationIds"
      render={({ field }) => {
        const options = routineIntegrationOptions(integrations, field.value);
        if (!options || options.length === 0) return <></>;
        const toggle = (id: string, on: boolean) =>
          field.onChange(
            on
              ? [...field.value, id]
              : field.value.filter((selected) => selected !== id),
          );
        return (
          <FormItem className="space-y-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>{t('form.integrations')}</FormLabel>
              <FormDescription>
                {t('form.integrationsDescription')}
              </FormDescription>
            </div>
            {options.map((option) => (
              <IntegrationSwitch
                key={option.id}
                option={option}
                selected={field.value.includes(option.id)}
                disabled={disabled}
                onToggle={(on) => toggle(option.id, on)}
              />
            ))}
          </FormItem>
        );
      }}
    />
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
  const id = `routine-integration-${option.id}`;
  const locked = !canToggleIntegration(option, selected);
  const control = (
    <Switch
      id={id}
      checked={selected}
      onCheckedChange={onToggle}
      disabled={disabled || locked}
      data-testid={`routine-form-integration-${option.id}`}
    />
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {option.name ?? t('form.integrationUnavailable')}
      </Label>
      {locked ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{control}</div>
            </TooltipTrigger>
            <TooltipContent>
              {tCommon('chatInput.integrationNotAuthorized')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        control
      )}
    </div>
  );
}
