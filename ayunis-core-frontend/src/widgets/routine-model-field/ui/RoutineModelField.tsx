import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useModelModes } from '@/features/useModelModes';
import {
  DEFAULT_MODEL_OPTION,
  selectedModelMode,
  type RoutineFormFields,
} from '@/features/routines';
import {
  ModelSelectOptions,
  type ModeOption,
} from '@/widgets/model-select-options';
import {
  MODEL_MODES,
  getModeFromValue,
  getModeValue,
  resolveModeModel,
} from '@ayunis/chat/model-presentation';

/** The routine's model: the user's default, a mode, or a permitted model. */
export function RoutineModelField({
  form,
  disabled,
}: Readonly<{ form: UseFormReturn<RoutineFormFields>; disabled: boolean }>) {
  const { t } = useTranslation('routines');
  const { models, isDisabled } = usePermittedModels();
  const { resolutions } = useModelModes();
  // A mode is checked like this when the routine is saved; a stored one that
  // no longer resolves stays visible as the selection.
  const modes: ModeOption[] = MODEL_MODES.map((mode) => {
    const resolvedModel = resolveModeModel(mode, models, resolutions);
    return { mode, resolvedModel, disabled: !resolvedModel };
  });

  return (
    <FormField
      control={form.control}
      name="modelId"
      render={({ field }) => {
        const mode = selectedModelMode(field.value);
        return (
          <FormItem>
            <FormLabel>{t('form.model')}</FormLabel>
            <Select
              value={mode ? getModeValue(mode) : field.value}
              onValueChange={(value) => {
                const chosenMode = getModeFromValue(value);
                // Disabled modes stay reachable by typeahead, since they
                // are only aria-disabled to keep their hover cards.
                const isDisabledMode = modes.some(
                  (option) => option.mode === chosenMode && option.disabled,
                );
                if (!isDisabledMode) field.onChange(chosenMode ?? value);
              }}
              disabled={disabled || isDisabled}
            >
              <FormControl>
                <SelectTrigger data-testid="routine-form-model">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem
                  value={DEFAULT_MODEL_OPTION}
                  data-testid="routine-form-model-default"
                >
                  {t('form.defaultModel')}
                </SelectItem>
                <ModelSelectOptions
                  models={models}
                  showHeading={false}
                  modes={modes}
                />
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
