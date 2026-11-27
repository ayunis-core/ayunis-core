import {
  AdventCalendarDoorState,
  type AdventCalendarResponseDto,
} from '@ayunis/api-client/schemas';
import { adventSeasonYear, todaysDoor } from '@/features/advent-calendar';

/**
 * Today's door, while the calendar is visible and the door is openable and
 * not yet opened in this browser; otherwise null. A super admin's preview of
 * an invisible calendar gets no card.
 */
export function adventCalendarCardDoor(
  calendar: AdventCalendarResponseDto,
  isOpened: (seasonYear: number, day: number) => boolean,
): number | null {
  if (!calendar.visible) return null;
  const now = new Date(calendar.now);
  const day = todaysDoor(now);
  const door = calendar.doors.find((candidate) => candidate.day === day);
  if (door?.state !== AdventCalendarDoorState.openable) return null;
  return isOpened(adventSeasonYear(now), door.day) ? null : door.day;
}
