// Types
import type { ToolUseMessageContent } from '../../model/openapi';
import type { CalendarEventInput } from '../../api/useGenerateIcs';
import { cn } from '@/shared/lib/shadcn/utils';

// Utils
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

// API
import { useGenerateIcs } from '../../api/useGenerateIcs';

// Shadcn
import { Label } from '@/shared/ui/shadcn/label';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';

// Widgets
import { DateTimePickerWidget } from '@/widgets/date-time-picker/ui/DateTimePickerWidget';

function parseTimeFromIso(
  isoString: string | undefined,
  fallback: string,
): string {
  return isoString
    ? new Date(isoString).toISOString().substring(11, 19)
    : fallback;
}

function parseDateFromIso(isoString: string | undefined): Date | undefined {
  return isoString ? new Date(isoString) : undefined;
}

export default function CreateCalendarEventWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const { generate } = useGenerateIcs();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as Partial<CalendarEventInput>;

  // Derive initial values directly from params to avoid setState in useEffect
  const initialTitle = params.title ?? '';
  const initialDescription = params.description ?? '';
  const initialLocation = params.location ?? '';
  const initialStartDate = parseDateFromIso(params.start);
  const initialEndDate = parseDateFromIso(params.end);
  const initialStartTime = parseTimeFromIso(params.start, '10:30:00');
  const initialEndTime = parseTimeFromIso(params.end, '11:30:00');

  const [title, setTitle] = useState<string>(initialTitle);
  const [description, setDescription] = useState<string>(initialDescription);
  const [location, setLocation] = useState<string>(initialLocation);
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [endTime, setEndTime] = useState<string>(initialEndTime);

  // Update state when params change (for streaming updates)
  useEffect(() => {
    const updateWidget = () => {
      setTitle(params.title ?? '');
      setDescription(params.description ?? '');
      setLocation(params.location ?? '');
      setStartDate(parseDateFromIso(params.start));
      setEndDate(parseDateFromIso(params.end));
      setStartTime(parseTimeFromIso(params.start, '10:30:00'));
      setEndTime(parseTimeFromIso(params.end, '11:30:00'));
    };
    updateWidget();
  }, [
    params.title,
    params.description,
    params.location,
    params.start,
    params.end,
    content.id,
  ]);

  function combineDateTime(d?: Date, time?: string): string | undefined {
    if (!d || !time) {
      return undefined;
    }

    const [hh = '00', mm = '00', ss = '00'] = time.split(':');
    const combined = new Date(d);
    combined.setHours(Number(hh), Number(mm), Number(ss || 0), 0);
    return combined.toISOString();
  }

  const isInvalidRange = useMemo(() => {
    const startIso = combineDateTime(startDate, startTime);
    const endIso = combineDateTime(endDate, endTime);
    if (!startIso || !endIso) {
      return false;
    }

    return new Date(endIso) <= new Date(startIso);
  }, [startDate, startTime, endDate, endTime]);

  function downloadIcs() {
    const startIso = combineDateTime(startDate, startTime);
    const endIso = combineDateTime(endDate, endTime);
    if (!title || !startIso || !endIso) {
      return;
    }

    const dto: CalendarEventInput = {
      title,
      description: description || undefined,
      location: location || undefined,
      start: startIso,
      end: endIso,
    };

    if (isInvalidRange) {
      showError(
        t('chat.tools.create_calendar_event.invalidRange', {
          defaultValue: 'End must be after start',
        }),
      );
      return;
    }

    const icsContent = generate(dto);
    if (!icsContent || typeof icsContent !== 'string') {
      showError(t('chat.errorUnexpected'));
      return;
    }

    const blob = new Blob([icsContent], {
      type: 'text/calendar; charset=utf-8',
    });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${title || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      <div className="space-y-2 w-full">
        <Label
          htmlFor={`calendar-title-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_calendar_event.title')}
        </Label>
        <Input
          id={`calendar-title-${content.id}`}
          className={cn('w-full', isStreaming && 'animate-pulse')}
          placeholder={t('chat.tools.create_calendar_event.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`calendar-description-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_calendar_event.description')}
        </Label>
        <Textarea
          id={`calendar-description-${content.id}`}
          className={cn('h-32', isStreaming && 'animate-pulse')}
          placeholder={t(
            'chat.tools.create_calendar_event.descriptionPlaceholder',
          )}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`calendar-location-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_calendar_event.location')}
        </Label>
        <Input
          id={`calendar-location-${content.id}`}
          className={cn('w-full', isStreaming && 'animate-pulse')}
          placeholder={t(
            'chat.tools.create_calendar_event.locationPlaceholder',
          )}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <DateTimePickerWidget
          label={t('chat.tools.create_calendar_event.start')}
          date={startDate}
          time={startTime}
          onDateChange={setStartDate}
          onTimeChange={setStartTime}
          selectDatePlaceholder={t(
            'chat.tools.create_calendar_event.selectDate',
            {
              defaultValue: 'Select date',
            },
          )}
          isStreaming={isStreaming}
        />
        <DateTimePickerWidget
          label={t('chat.tools.create_calendar_event.end')}
          date={endDate}
          time={endTime}
          onDateChange={setEndDate}
          onTimeChange={setEndTime}
          selectDatePlaceholder={t(
            'chat.tools.create_calendar_event.selectDate',
            {
              defaultValue: 'Select date',
            },
          )}
          isStreaming={isStreaming}
        />
      </div>

      <div className="w-full flex gap-2">
        <Button
          onClick={downloadIcs}
          disabled={!title || !startDate || !endDate || isInvalidRange}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_calendar_event.downloadIcs')}
        </Button>
      </div>
    </div>
  );
}
