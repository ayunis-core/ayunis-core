import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';

export abstract class AdventCalendarDoorsRepository {
  /** The filled doors, by day. */
  abstract findAll(): Promise<AdventCalendarDoor[]>;
  abstract findByDay(day: number): Promise<AdventCalendarDoor | null>;
  /**
   * Reads the door and locks its row until the ambient transaction ends, so a
   * concurrent write cannot swap its image in between.
   */
  abstract findByDayForUpdate(day: number): Promise<AdventCalendarDoor | null>;
  /** Creates or replaces the door of its day. */
  abstract save(door: AdventCalendarDoor): Promise<AdventCalendarDoor>;
  /** The deleted door, or null when the day had none. */
  abstract delete(day: number): Promise<AdventCalendarDoor | null>;
}
