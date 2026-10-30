import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, XIcon } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Calendar } from '@ayunis/ui/components/calendar';
import {
  FormControl,
  FormDescription,
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
import { formatDate } from '@/shared/lib/format-date';

interface ExpiresAtFormItemProps {
  value?: Date;
  onChange: (date?: Date) => void;
}

export function ExpiresAtFormItem({
  value,
  onChange,
}: Readonly<ExpiresAtFormItemProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const [open, setOpen] = useState(false);

  return (
    <FormItem>
      <FormLabel>{t('apiKeys.createDialog.expiresAtLabel')}</FormLabel>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-full justify-start font-normal',
                  !value && 'text-muted-foreground',
                )}
                data-testid="api-key-expires-at-trigger"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value
                  ? formatDate(value.toISOString())
                  : t('apiKeys.createDialog.expiresAtPlaceholder')}
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange(undefined)}
            aria-label={t('apiKeys.createDialog.expiresAtClear')}
            data-testid="api-key-expires-at-clear"
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
  );
}
