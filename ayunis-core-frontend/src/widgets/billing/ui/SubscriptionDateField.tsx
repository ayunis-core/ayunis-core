import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { CalendarIcon, XIcon } from 'lucide-react';
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
import type { CreateSubscriptionFormData } from '@/widgets/billing/model/types';

export default function SubscriptionDateField({
  form,
  t,
  name,
}: Readonly<{
  form: UseFormReturn<CreateSubscriptionFormData>;
  t: (key: string) => string;
  name: 'startsAt' | 'endsAt';
}>) {
  const [open, setOpen] = useState(false);
  const startsAt = form.watch('startsAt');
  const minDate =
    name === 'endsAt' && startsAt ? new Date(startsAt) : new Date();
  // A fixed term may run for several years, so the end picker reaches further.
  const horizonYears = name === 'endsAt' ? 5 : 1;
  const key = `subscriptionDialog.${name}`;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const selectedDate = field.value ? new Date(field.value) : undefined;
        return (
          <FormItem>
            <FormLabel>{t(`${key}Label`)}</FormLabel>
            <div className="flex items-center gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid={
                        name === 'startsAt'
                          ? 'subscription-start-date-picker'
                          : 'subscription-end-date-picker'
                      }
                      className={cn(
                        'w-full justify-start font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon />
                      {selectedDate
                        ? selectedDate.toLocaleDateString()
                        : t(`${key}Placeholder`)}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      field.onChange(date?.toISOString());
                      setOpen(false);
                    }}
                    disabled={(date) => date <= minDate}
                    captionLayout="dropdown"
                    endMonth={
                      new Date(minDate.getFullYear() + horizonYears, 11)
                    }
                  />
                </PopoverContent>
              </Popover>
              {field.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t(`${key}Clear`)}
                  className="h-8 w-8 shrink-0"
                  onClick={() => field.onChange(undefined)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            <FormDescription>{t(`${key}Description`)}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
