import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@ayunis/ui/components/button';
import { Calendar } from '@ayunis/ui/components/calendar';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ayunis/ui/components/popover';
import { cn } from '@ayunis/ui/lib/cn';
import { CalendarIcon } from 'lucide-react';
import type { UpdateSubscriptionStartDateFormData } from '../model/types';
import { utcDateToLocal } from '../lib/subscription-start-date';

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
                  <CalendarIcon />
                  {utcDateToLocal(field.value).toLocaleDateString()}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={utcDateToLocal(field.value)}
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
