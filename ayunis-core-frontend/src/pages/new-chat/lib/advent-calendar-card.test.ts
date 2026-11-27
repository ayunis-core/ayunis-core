import { describe, expect, it } from 'vitest';
import {
  AdventCalendarDoorState,
  type AdventCalendarResponseDto,
} from '@ayunis/api-client/schemas';
import { adventCalendarCardDoor } from './advent-calendar-card';

const DEC_10 = '2026-12-10T09:00:00+01:00';

function calendar(
  overrides: Partial<AdventCalendarResponseDto> = {},
  todaysState: AdventCalendarDoorState = AdventCalendarDoorState.openable,
): AdventCalendarResponseDto {
  return {
    visible: true,
    preview: false,
    now: DEC_10,
    doors: [
      { day: 9, state: AdventCalendarDoorState.openable, content: null },
      { day: 10, state: todaysState, content: null },
    ],
    ...overrides,
  };
}

const neverOpened = () => false;

describe('adventCalendarCardDoor', () => {
  it("offers today's openable door by the server's Berlin date", () => {
    expect(adventCalendarCardDoor(calendar(), neverOpened)).toBe(10);
  });

  it("hides the card once today's door was opened in this season", () => {
    const opened = (seasonYear: number, day: number) =>
      seasonYear === 2026 && day === 10;
    expect(adventCalendarCardDoor(calendar(), opened)).toBeNull();
  });

  it("hides the card when today's door is empty", () => {
    expect(
      adventCalendarCardDoor(
        calendar({}, AdventCalendarDoorState.empty),
        neverOpened,
      ),
    ).toBeNull();
  });

  it('hides the card from a super admin previewing an invisible calendar', () => {
    expect(
      adventCalendarCardDoor(
        calendar({ visible: false, preview: true }),
        neverOpened,
      ),
    ).toBeNull();
  });

  it('hides the card after 24 December, while the season still runs', () => {
    expect(
      adventCalendarCardDoor(
        calendar({ now: '2026-12-28T09:00:00+01:00' }),
        neverOpened,
      ),
    ).toBeNull();
  });
});
