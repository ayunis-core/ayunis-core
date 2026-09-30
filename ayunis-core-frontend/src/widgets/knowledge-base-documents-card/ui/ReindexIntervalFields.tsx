import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@ayunis/ui/components/input';
import { Switch } from '@ayunis/ui/components/switch';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@ayunis/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { ReindexIntervalUnit } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { REINDEX_INTERVAL_MAX_VALUE } from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';
import type { ReindexScheduleFormFields } from '@/widgets/knowledge-base-documents-card/model/types';

/** Must be rendered inside a `<Form>` whose fields include `reindexInterval`. */
export function ReindexIntervalFields({
  disabled = false,
}: Readonly<{ disabled?: boolean }>) {
  const { t } = useTranslation('knowledge-bases');
  const { control } = useFormContext<ReindexScheduleFormFields>();
  const [enabled, unit] = useWatch({
    control,
    name: ['reindexInterval.enabled', 'reindexInterval.unit'],
  });

  return (
    <div className="grid gap-3">
      <FormField
        control={control}
        name="reindexInterval.enabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4">
            <div className="grid gap-1">
              <FormLabel>
                {t('detail.documents.reindex.enabledLabel')}
              </FormLabel>
              <FormDescription>
                {t('detail.documents.reindex.enabledHint')}
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
                data-testid="reindex-interval-enabled"
              />
            </FormControl>
          </FormItem>
        )}
      />
      {enabled && (
        <div className="flex items-start gap-2">
          <span className="pt-2 text-sm">
            {t('detail.documents.reindex.every')}
          </span>
          <FormField
            control={control}
            name="reindexInterval.value"
            render={({ field }) => (
              <FormItem className="w-24">
                <FormLabel className="sr-only">
                  {t('detail.documents.reindex.valueLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={REINDEX_INTERVAL_MAX_VALUE[unit]}
                    step={1}
                    disabled={disabled}
                    data-testid="reindex-interval-value"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) =>
                      field.onChange(event.currentTarget.valueAsNumber)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="reindexInterval.unit"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">
                  {t('detail.documents.reindex.unitLabel')}
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger
                      className="w-full"
                      data-testid="reindex-interval-unit"
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ReindexIntervalUnit).map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        data-testid={`reindex-interval-unit-${option}`}
                      >
                        {t(`detail.documents.reindex.units.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
      )}
      {enabled && <ReindexIntervalMessage />}
    </div>
  );
}

/** One message line for the value/unit pair, which read as a single input. */
function ReindexIntervalMessage() {
  const { control } = useFormContext<ReindexScheduleFormFields>();
  const { errors } = useFormState({ control, name: 'reindexInterval' });
  const message =
    errors.reindexInterval?.value?.message ??
    errors.reindexInterval?.unit?.message;
  if (!message) return null;
  return (
    <p
      className="text-destructive text-sm"
      role="alert"
      data-testid="reindex-interval-error"
    >
      {message}
    </p>
  );
}
