import { useState } from 'react';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { Calendar } from '@/shared/ui/shadcn/calendar';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';

interface DateTimePickerWidgetProps {
  label: string;
  date?: Date;
  time: string;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time: string) => void;
  selectDatePlaceholder: string;
  isStreaming?: boolean;
}

export function DateTimePickerWidget({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  selectDatePlaceholder,
  isStreaming = false,
}: Readonly<DateTimePickerWidgetProps>) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label className={cn('px-1', isStreaming && 'animate-pulse')}>
        {label}
      </Label>

      <div className="flex gap-4">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-40 justify-between font-normal',
                isStreaming && 'animate-pulse',
              )}
            >
              {date ? date.toLocaleDateString() : selectDatePlaceholder}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(d) => {
                onDateChange(d ?? undefined);
                setIsDatePickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          step="1"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className={cn(
            'bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
            isStreaming && 'animate-pulse',
          )}
        />
      </div>
    </div>
  );
}
