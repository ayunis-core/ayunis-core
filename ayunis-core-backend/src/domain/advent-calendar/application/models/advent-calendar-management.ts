import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';

export interface AdventCalendarManagement {
  readonly enabled: boolean;
  /** The filled doors, by day. */
  readonly doors: AdventCalendarDoor[];
}
