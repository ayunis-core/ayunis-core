import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type {
  DoorFormFields,
  DoorMediaKind,
} from '@/pages/super-admin-settings/advent-calendar/model/types';
import DoorImageField from './DoorImageField';

const MEDIA_KINDS: DoorMediaKind[] = ['none', 'image', 'vimeo'];

interface DoorMediaFieldsProps {
  savedImageUrl: string | null;
  disabled: boolean;
}

export default function DoorMediaFields({
  savedImageUrl,
  disabled,
}: Readonly<DoorMediaFieldsProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const form = useFormContext<DoorFormFields>();
  const mediaKind = useWatch({ control: form.control, name: 'mediaKind' });

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="mediaKind"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('media.label')}</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger
                  className="w-48"
                  data-testid="advent-calendar-door-media-kind"
                >
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {MEDIA_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`media.kinds.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      {mediaKind === 'image' && (
        <DoorImageField savedImageUrl={savedImageUrl} disabled={disabled} />
      )}
      {mediaKind === 'vimeo' && (
        <FormField
          control={form.control}
          name="vimeoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('media.vimeoUrl')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="https://vimeo.com/76979871"
                  disabled={disabled}
                  data-testid="advent-calendar-door-vimeo-url"
                />
              </FormControl>
              <FormDescription>
                {t('media.vimeoUrlDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
