import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type { AdventDoorDisplayState } from '@/pages/advent-calendar/model/door-display-state';

interface AdventCalendarDoorProps {
  day: number;
  state: AdventDoorDisplayState;
  isToday: boolean;
  onOpen: (day: number) => void;
}

export function AdventCalendarDoor({
  day,
  state,
  isToday,
  onOpen,
}: Readonly<AdventCalendarDoorProps>) {
  const { t } = useTranslation('advent-calendar');
  const canOpen = state === 'openable' || state === 'opened';

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => onOpen(day)}
      aria-label={t(`door.label.${state}`, { day })}
      aria-current={isToday ? 'date' : undefined}
      data-testid={`advent-calendar-door-${day}`}
      data-state={state}
      data-today={isToday}
      className={cn(
        'advent-calendar-door relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border bg-card text-card-foreground shadow-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed',
        state === 'openable' && 'hover:bg-accent',
        state === 'opened' && 'border-dashed bg-muted hover:bg-accent',
        state === 'empty' && 'bg-muted text-muted-foreground',
        state === 'locked' && 'text-muted-foreground',
        isToday && 'border-brand ring-2 ring-brand',
      )}
    >
      <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
        {day}
      </span>
      {state === 'locked' && <Lock className="size-4" aria-hidden />}
      {state === 'opened' && <Check className="size-4" aria-hidden />}
      {isToday && (
        <span className="text-xs font-medium text-brand">
          {t('door.today')}
        </span>
      )}
    </button>
  );
}
