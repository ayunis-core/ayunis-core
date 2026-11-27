import { useTranslation } from 'react-i18next';
import { Check, Star } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type { AdventDoorDisplayState } from '@/pages/advent-calendar/model/door-display-state';
import {
  formatCountdownClock,
  type DoorCountdown,
} from '@/pages/advent-calendar/lib/door-countdown';

interface AdventCalendarDoorProps {
  day: number;
  state: AdventDoorDisplayState;
  isToday: boolean;
  /** Set for a locked door. */
  countdown: DoorCountdown | null;
  onOpen: (day: number, door: HTMLElement) => void;
}

export function AdventCalendarDoor({
  day,
  state,
  isToday,
  countdown,
  onOpen,
}: Readonly<AdventCalendarDoorProps>) {
  const { t } = useTranslation('advent-calendar');
  const canOpen = state === 'openable' || state === 'opened';

  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={(event) => onOpen(day, event.currentTarget)}
      aria-label={t(`door.label.${state}`, { day })}
      aria-current={isToday ? 'date' : undefined}
      data-testid={`advent-calendar-door-${day}`}
      data-state={state}
      data-today={isToday}
      className={cn(
        'advent-calendar-door group relative aspect-square rounded-lg',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed',
      )}
    >
      <span
        aria-hidden
        className="advent-calendar-door__inside absolute inset-0 flex items-center justify-end rounded-lg border pr-[12%]"
      >
        {state === 'opened' ? (
          <Check className="size-5 text-brand" />
        ) : (
          <Star className="size-5 fill-warning text-warning" />
        )}
      </span>
      <span
        className={cn(
          'advent-calendar-door__leaf absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border bg-card text-card-foreground shadow-xs',
          state === 'openable' && 'group-hover:bg-accent',
          state === 'empty' && 'bg-muted text-muted-foreground',
          state === 'locked' && 'text-muted-foreground',
          isToday && 'border-brand ring-2 ring-brand',
        )}
      >
        <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {day}
        </span>
        {countdown && <DoorCountdownText countdown={countdown} />}
        {isToday && (
          <span className="text-xs font-medium text-brand">
            {t('door.today')}
          </span>
        )}
        <span aria-hidden className="advent-calendar-door__knob" />
      </span>
    </button>
  );
}

function DoorCountdownText({
  countdown,
}: Readonly<{ countdown: DoorCountdown }>) {
  const { t } = useTranslation('advent-calendar');
  return (
    <span
      className="text-[10px] leading-none font-medium whitespace-nowrap tabular-nums sm:text-xs"
      data-testid="advent-calendar-countdown"
      data-kind={countdown.kind}
    >
      {countdown.kind === 'days'
        ? t('door.daysLeft', { count: countdown.days })
        : formatCountdownClock(countdown.msLeft)}
    </span>
  );
}
