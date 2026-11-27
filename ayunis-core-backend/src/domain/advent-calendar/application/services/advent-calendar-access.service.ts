import { Injectable } from '@nestjs/common';
import {
  getRequiredUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import type {
  AdventCalendarDoorView,
  AdventCalendarView,
} from 'src/domain/advent-calendar/application/models/advent-calendar-view';
import type { AdventCalendarDoor } from 'src/domain/advent-calendar/domain/advent-calendar-door.entity';
import { ADVENT_CALENDAR_DOOR_COUNT } from 'src/domain/advent-calendar/domain/advent-calendar.constants';
import {
  AdventCalendarDoorState,
  doorState,
  isAdventSeason,
} from 'src/domain/advent-calendar/domain/advent-calendar-season';
import { GetAdventCalendarEnabledUseCase } from 'src/iam/platform-config/application/use-cases/get-advent-calendar-enabled/get-advent-calendar-enabled.use-case';
import { AdventCalendarClock } from './advent-calendar-clock.service';

/** What the calendar shows the current caller right now. */
export interface AdventCalendarAccess {
  readonly now: Date;
  readonly visible: boolean;
  readonly preview: boolean;
}

/** Whether the caller sees any door at all. */
export function seesDoors(access: AdventCalendarAccess): boolean {
  return access.visible || access.preview;
}

/**
 * The state of a door for the caller. Super admins preview every door with
 * content; everyone else gets the unlock rule while the calendar is visible.
 */
export function doorStateFor(
  access: AdventCalendarAccess,
  day: number,
  door: AdventCalendarDoor | null,
): AdventCalendarDoorState {
  if (access.preview && door) return AdventCalendarDoorState.OPENABLE;
  if (!seesDoors(access)) return AdventCalendarDoorState.LOCKED;
  return doorState(access.now, day, door !== null);
}

/** The door, if the caller may open it; null otherwise. */
export function openableDoorFor(
  access: AdventCalendarAccess,
  day: number,
  door: AdventCalendarDoor | null,
): AdventCalendarDoor | null {
  return doorStateFor(access, day, door) === AdventCalendarDoorState.OPENABLE
    ? door
    : null;
}

export function buildAdventCalendarView(
  access: AdventCalendarAccess,
  filled: readonly AdventCalendarDoor[],
): AdventCalendarView {
  const byDay = new Map(filled.map((door) => [door.day, door]));
  const doors: AdventCalendarDoorView[] = seesDoors(access)
    ? Array.from({ length: ADVENT_CALENDAR_DOOR_COUNT }, (_, index) => {
        const day = index + 1;
        const door = byDay.get(day) ?? null;
        return {
          day,
          state: doorStateFor(access, day, door),
          door: openableDoorFor(access, day, door),
        };
      })
    : [];
  return { ...access, doors };
}

@Injectable()
export class AdventCalendarAccessService {
  constructor(
    private readonly clock: AdventCalendarClock,
    private readonly getEnabled: GetAdventCalendarEnabledUseCase,
    private readonly context: ContextService,
  ) {}

  async resolve(): Promise<AdventCalendarAccess> {
    getRequiredUserContext(this.context);
    const now = this.clock.now();
    const visible = isAdventSeason(now) && (await this.getEnabled.execute());
    return { now, visible, preview: isSuperAdmin(this.context) };
  }
}
