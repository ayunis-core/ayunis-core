import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import type { SuperAdminAdventCalendarDoorResponseDto } from '@ayunis/api-client/schemas';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useClearAdventCalendarDoor } from '@/pages/super-admin-settings/advent-calendar/api/useClearAdventCalendarDoor';
import { useSaveAdventCalendarDoor } from '@/pages/super-admin-settings/advent-calendar/api/useSaveAdventCalendarDoor';
import { toDoorFormValues } from '@/pages/super-admin-settings/advent-calendar/lib/door-form-values';
import { doorImageUrl } from '@/pages/super-admin-settings/advent-calendar/lib/door-image-url';
import {
  DOOR_BODY_MAX_LENGTH,
  DOOR_TITLE_MAX_LENGTH,
} from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';
import DoorButtonsFields from './DoorButtonsFields';
import DoorMediaFields from './DoorMediaFields';

interface DoorEditorProps {
  door: SuperAdminAdventCalendarDoorResponseDto;
}

function savedImageUrlOf(door: SuperAdminAdventCalendarDoorResponseDto) {
  const content = door.content;
  return content?.media?.type === 'image'
    ? doorImageUrl(door.day, content.updatedAt)
    : null;
}

export default function DoorEditor({ door }: Readonly<DoorEditorProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const { confirm } = useConfirmation();
  const form = useForm<DoorFormFields>({
    defaultValues: toDoorFormValues(door.content),
  });
  const { saveDoor, isSaving } = useSaveAdventCalendarDoor(
    door.day,
    form,
    door.content !== null,
  );
  const { clearDoor, isClearing } = useClearAdventCalendarDoor(door.day, () =>
    form.reset(toDoorFormValues(null)),
  );
  const isBusy = isSaving || isClearing;

  function confirmClear() {
    confirm({
      title: t('door.clearConfirm.title', { day: door.day }),
      description: t('door.clearConfirm.description'),
      confirmText: t('door.clearConfirm.confirm'),
      cancelText: t('door.clearConfirm.cancel'),
      variant: 'destructive',
      onConfirm: clearDoor,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Server errors on array roots are never revalidated, so they would
          // keep handleSubmit from ever calling saveDoor again.
          form.clearErrors();
          void form.handleSubmit(saveDoor)(e);
        }}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('door.title')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={DOOR_TITLE_MAX_LENGTH}
                  disabled={isBusy}
                  data-testid="advent-calendar-door-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('door.body')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={DOOR_BODY_MAX_LENGTH}
                  className="min-h-[120px]"
                  disabled={isBusy}
                  data-testid="advent-calendar-door-body"
                />
              </FormControl>
              <FormDescription>{t('door.bodyDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DoorMediaFields
          savedImageUrl={savedImageUrlOf(door)}
          disabled={isBusy}
        />
        <DoorButtonsFields disabled={isBusy} />
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isBusy}
            data-testid="advent-calendar-door-save"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('door.save')}
          </Button>
          {door.content && (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={confirmClear}
              data-testid="advent-calendar-door-clear"
            >
              {t('door.clear')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
