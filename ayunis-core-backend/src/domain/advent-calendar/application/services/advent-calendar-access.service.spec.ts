import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  aDoor,
  A_QUIZ,
  anImage,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { AdventCalendarDoorState } from 'src/domain/advent-calendar/domain/advent-calendar-season';
import type { GetAdventCalendarEnabledUseCase } from 'src/iam/platform-config/application/use-cases/get-advent-calendar-enabled/get-advent-calendar-enabled.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  AdventCalendarAccessService,
  buildAdventCalendarView,
  openableDoorFor,
  type AdventCalendarAccess,
} from './advent-calendar-access.service';
import type { AdventCalendarClock } from './advent-calendar-clock.service';

const DECEMBER_5 = new Date('2026-12-05T08:00:00+01:00');
const JULY = new Date('2026-07-15T12:00:00+02:00');

const user: AdventCalendarAccess = {
  now: DECEMBER_5,
  visible: true,
  preview: false,
};
const superAdmin: AdventCalendarAccess = {
  now: JULY,
  visible: false,
  preview: true,
};

const openToday = aDoor({ day: 5, media: anImage() });
const lockedTomorrow = aDoor({ day: 6, media: anImage('tomorrow') });

describe('advent calendar access', () => {
  describe('for a user', () => {
    it('shows no door while the calendar is not visible', () => {
      const view = buildAdventCalendarView({ ...user, visible: false }, [
        openToday,
      ]);

      expect(view.doors).toEqual([]);
      expect(view.visible).toBe(false);
    });

    it('returns the content of an opened door and none of a locked one', () => {
      const view = buildAdventCalendarView(user, [openToday, lockedTomorrow]);

      expect(view.preview).toBe(false);
      expect(view.doors).toHaveLength(24);
      expect(view.doors[4]).toEqual({
        day: 5,
        state: AdventCalendarDoorState.OPENABLE,
        door: openToday,
      });
      expect(view.doors[5]).toEqual({
        day: 6,
        state: AdventCalendarDoorState.LOCKED,
        door: null,
      });
      expect(JSON.stringify(view.doors[5])).not.toContain(A_QUIZ.question);
    });

    it('marks a due door without content as empty', () => {
      const view = buildAdventCalendarView(user, []);

      expect(view.doors[0].state).toBe(AdventCalendarDoorState.EMPTY);
      expect(view.doors[0].door).toBeNull();
    });

    it("may not open a locked door, so its image isn't served", () => {
      expect(openableDoorFor(user, 6, lockedTomorrow)).toBeNull();
      expect(
        openableDoorFor({ ...user, visible: false }, 5, openToday),
      ).toBeNull();
    });
  });

  describe('for a super admin', () => {
    it('previews every door with content, out of season and switched off', () => {
      const view = buildAdventCalendarView(superAdmin, [lockedTomorrow]);

      expect(view.preview).toBe(true);
      expect(view.doors[5]).toEqual({
        day: 6,
        state: AdventCalendarDoorState.OPENABLE,
        door: lockedTomorrow,
      });
      expect(view.doors[0].state).toBe(AdventCalendarDoorState.LOCKED);
      expect(openableDoorFor(superAdmin, 6, lockedTomorrow)).toBe(
        lockedTomorrow,
      );
    });
  });

  describe('resolve', () => {
    const context = (systemRole?: SystemRole) =>
      ({
        get: jest.fn(
          (key: string) =>
            ({
              userId: 'b6c9c1a4-77d4-4b8a-9f3c-0f0d3a1e6f00',
              orgId: '0c6b9f5e-1d2a-4c3b-8e4f-5a6b7c8d9e0f',
              role: UserRole.USER,
              systemRole,
            })[key],
        ),
      }) as unknown as ContextService;
    const clock = (now: Date) => ({ now: () => now }) as AdventCalendarClock;
    const enabled = (value: boolean) =>
      ({
        execute: jest.fn().mockResolvedValue(value),
      }) as unknown as GetAdventCalendarEnabledUseCase;

    it('is visible only with the switch on and today in season', async () => {
      const on = new AdventCalendarAccessService(
        clock(DECEMBER_5),
        enabled(true),
        context(SystemRole.CUSTOMER),
      );
      const off = new AdventCalendarAccessService(
        clock(DECEMBER_5),
        enabled(false),
        context(SystemRole.CUSTOMER),
      );
      const summer = new AdventCalendarAccessService(
        clock(JULY),
        enabled(true),
        context(SystemRole.CUSTOMER),
      );

      expect(await on.resolve()).toEqual({
        now: DECEMBER_5,
        visible: true,
        preview: false,
      });
      expect((await off.resolve()).visible).toBe(false);
      expect((await summer.resolve()).visible).toBe(false);
    });

    it('previews for a super admin only', async () => {
      const access = await new AdventCalendarAccessService(
        clock(JULY),
        enabled(false),
        context(SystemRole.SUPER_ADMIN),
      ).resolve();

      expect(access).toEqual({ now: JULY, visible: false, preview: true });
    });

    it('refuses a caller that is not a signed-in user', async () => {
      const service = new AdventCalendarAccessService(
        clock(DECEMBER_5),
        enabled(true),
        context(),
      );

      await expect(service.resolve()).rejects.toThrow(UnauthorizedAccessError);
    });
  });
});
