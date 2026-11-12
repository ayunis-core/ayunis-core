import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Textarea } from '@ayunis/ui/components/textarea';
import { INTEGRATION_INSTRUCTIONS_MAX_LENGTH } from '@/pages/admin-settings/integrations-settings/lib/integration-instructions';

interface InstructionsFormValues {
  instructions?: string | null;
}

export function IntegrationInstructionsField({
  disabled,
}: Readonly<{
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');
  const form = useFormContext<InstructionsFormValues>();
  return (
    <FormField
      control={form.control}
      name="instructions"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('integrations.instructions.label')}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ''}
              placeholder={t('integrations.instructions.placeholder')}
              maxLength={INTEGRATION_INSTRUCTIONS_MAX_LENGTH}
              className="max-h-60"
              disabled={disabled}
              data-testid="integration-instructions"
            />
          </FormControl>
          <FormDescription>
            {t('integrations.instructions.description')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
