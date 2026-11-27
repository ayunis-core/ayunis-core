import {
  AdventCalendarDoorState,
  type AdventCalendarResponseDto,
} from '@ayunis/api-client/schemas';
import { litCandleCount, todaysDoor } from '@/features/advent-calendar';
import { doorDisplayState } from '@/pages/advent-calendar/model/door-display-state';
import {
  doorCountdown,
  doorOpensAt,
} from '@/pages/advent-calendar/lib/door-countdown';
import { sparkleFrom } from '@/pages/advent-calendar/lib/door-sparkles';
import { useAdventClock } from '@/pages/advent-calendar/lib/useAdventClock';
import { AdventWreath } from './AdventWreath';
import { AdventCalendarDoor } from './AdventCalendarDoor';
import { AdventLights } from './AdventLights';
import { AdventSnow } from './AdventSnow';
import './advent-calendar.css';

interface AdventCalendarBoardProps {
  calendar: AdventCalendarResponseDto;
  receivedAt: number;
  effectsOn: boolean;
  isOpened: (day: number) => boolean;
  onOpen: (day: number) => void;
  onDoorDue: () => void;
}

export function AdventCalendarBoard({
  calendar,
  receivedAt,
  effectsOn,
  isOpened,
  onOpen,
  onDoorDue,
}: Readonly<AdventCalendarBoardProps>) {
  const calendarNow = new Date(calendar.now);
  const lockedDays = calendar.doors
    .filter((door) => door.state === AdventCalendarDoorState.locked)
    .map((door) => door.day);
  const nextOpening =
    lockedDays.length > 0
      ? doorOpensAt(calendarNow.getTime(), Math.min(...lockedDays))
      : null;
  const now = useAdventClock({
    serverNow: calendar.now,
    receivedAt,
    nextOpening,
    onDue: onDoorDue,
  });
  const today = todaysDoor(calendarNow);

  const openDoor = (day: number, door: HTMLElement) => {
    if (effectsOn) sparkleFrom(door);
    onOpen(day);
  };

  return (
    <div
      className="advent-calendar-scene relative isolate rounded-xl border bg-gradient-to-b from-brand/10 via-transparent to-transparent px-3 pt-12 pb-4 sm:px-6 sm:pb-6"
      data-effects={effectsOn ? 'on' : 'off'}
      data-testid="advent-calendar-scene"
    >
      <AdventLights />
      {effectsOn && <AdventSnow />}
      <div className="advent-calendar-board grid grid-flow-row-dense grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
        <div className="col-span-2 col-start-2 row-span-2 row-start-3 flex items-center sm:col-start-3 sm:row-span-3 sm:row-start-2">
          <AdventWreath litCandles={litCandleCount(calendarNow)} />
        </div>
        {calendar.doors.map((door) => (
          <AdventCalendarDoor
            key={door.day}
            day={door.day}
            state={doorDisplayState(door, isOpened)}
            isToday={door.day === today}
            countdown={
              door.state === AdventCalendarDoorState.locked
                ? doorCountdown(
                    doorOpensAt(calendarNow.getTime(), door.day),
                    now,
                  )
                : null
            }
            onOpen={openDoor}
          />
        ))}
      </div>
    </div>
  );
}
