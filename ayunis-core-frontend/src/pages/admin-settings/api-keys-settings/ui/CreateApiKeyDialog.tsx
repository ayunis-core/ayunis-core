import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Calendar } from '@/shared/ui/shadcn/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { cn } from '@/shared/lib/shadcn/utils';
import { useCreateApiKey } from '../api/useCreateApiKey';
import type { CreateApiKeyResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (response: CreateApiKeyResponseDto) => void;
}

interface CreateApiKeyFormValues {
  name: string;
  expiresAt?: Date;
}

/**
 * Convert a calendar-picked date to the corresponding instant at end-of-day
 * in the user's local timezone. Without this, `<Calendar>`'s default
 * UTC-midnight semantics would expire a "31 Dec" key hours before the user's
 * local 31 Dec ends.
 */
function toEndOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateApiKeyDialogProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { createApiKey, isCreating } = useCreateApiKey((response) => {
    onCreated(response);
    onOpenChange(false);
  });

  const form = useForm<CreateApiKeyFormValues>({
    defaultValues: {
      name: '',
      expiresAt: undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (data: CreateApiKeyFormValues) => {
    const expiresAt = data.expiresAt
      ? toEndOfLocalDay(data.expiresAt).toISOString()
      : undefined;
    createApiKey({ name: data.name, expiresAt });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>{t('apiKeys.createDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('apiKeys.createDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: t('apiKeys.createDialog.nameRequired'),
                  validate: (value) =>
                    value.trim().length >= 1 ||
                    t('apiKeys.createDialog.nameRequired'),
                  maxLength: {
                    value: 100,
                    message: t('apiKeys.createDialog.nameTooLong'),
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('apiKeys.createDialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('apiKeys.createDialog.namePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('apiKeys.createDialog.expiresAtLabel')}
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <Popover
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                'w-full justify-start font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? field.value.toLocaleDateString()
                                : t(
                                    'apiKeys.createDialog.expiresAtPlaceholder',
                                  )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDatePickerOpen(false);
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => field.onChange(undefined)}
                          aria-label={t('apiKeys.createDialog.expiresAtClear')}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      {t('apiKeys.createDialog.expiresAtHelper')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('apiKeys.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t('apiKeys.createDialog.creating')
                  : t('apiKeys.createDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
