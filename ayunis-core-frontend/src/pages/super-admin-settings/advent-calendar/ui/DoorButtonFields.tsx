import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import {
  DOOR_BUTTON_LABEL_MAX_LENGTH,
  DOOR_LINK_URL_MAX_LENGTH,
  DOOR_PROMPT_MAX_LENGTH,
} from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';
import DoorQuizFields from './DoorQuizFields';

interface DoorButtonFieldsProps {
  index: number;
  disabled: boolean;
  onRemove: () => void;
}

export default function DoorButtonFields({
  index,
  disabled,
  onRemove,
}: Readonly<DoorButtonFieldsProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const form = useFormContext<DoorFormFields>();
  const kind = useWatch({
    control: form.control,
    name: `buttons.${index}.kind`,
  });

  return (
    <div
      className="space-y-4 rounded-md border p-4"
      data-testid={`advent-calendar-door-button-${index}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {t(`buttons.kinds.${kind}`)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onRemove}
          aria-label={t('buttons.remove')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <FormField
        control={form.control}
        name={`buttons.${index}.label`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('buttons.buttonLabel')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                maxLength={DOOR_BUTTON_LABEL_MAX_LENGTH}
                disabled={disabled}
                data-testid="advent-calendar-button-label"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {kind === 'link' && (
        <FormField
          control={form.control}
          name={`buttons.${index}.url`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('buttons.url')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="/marketplace"
                  maxLength={DOOR_LINK_URL_MAX_LENGTH}
                  disabled={disabled}
                  data-testid="advent-calendar-button-url"
                />
              </FormControl>
              <FormDescription>{t('buttons.urlDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {kind === 'prompt' && (
        <FormField
          control={form.control}
          name={`buttons.${index}.prompt`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('buttons.prompt')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={DOOR_PROMPT_MAX_LENGTH}
                  disabled={disabled}
                  data-testid="advent-calendar-button-prompt"
                />
              </FormControl>
              <FormDescription>
                {t('buttons.promptDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {kind === 'quiz' && <DoorQuizFields index={index} disabled={disabled} />}
    </div>
  );
}
