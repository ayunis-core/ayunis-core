import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/shared/ui/shadcn/button';
import { Calendar } from '@/shared/ui/shadcn/calendar';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { cn } from '@/shared/lib/shadcn/utils';
import { CalendarIcon } from 'lucide-react';
import type { UpdateSubscriptionStartDateFormData } from '../model/types';

interface SubscriptionStartDateFieldProps {
  form: UseFormReturn<UpdateSubscriptionStartDateFormData>;
}

export default function SubscriptionStartDateField({
  form,
}: Readonly<SubscriptionStartDateFieldProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={form.control}
      name="startsAt"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('subscription.startsAtLabel')}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start font-normal')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {new Date(field.value).toLocaleDateString()}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(field.value)}
                onSelect={(date) => {
                  if (!date) {
                    return;
                  }
                  const utcDate = new Date(
                    Date.UTC(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                    ),
                  );
                  field.onChange(utcDate.toISOString());
                  setOpen(false);
                }}
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
          <FormDescription>
            {t('subscription.startsAtDescription')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
