import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import type { AdventCalendarDoorState } from 'src/domain/advent-calendar/domain/advent-calendar-season';

export interface AdventCalendarDoorView {
  readonly day: number;
  readonly state: AdventCalendarDoorState;
  /** Set exactly when the door is openable for the caller. */
  readonly door: AdventCalendarDoor | null;
}

export interface AdventCalendarView {
  /** The switch is on and today is in season. */
  readonly visible: boolean;
  /** The caller is a super admin, who may open every door with content. */
  readonly preview: boolean;
  readonly now: Date;
  /** Empty when the calendar is neither visible nor previewed. */
  readonly doors: AdventCalendarDoorView[];
}
