import { OparlSyncKind, OparlSyncRunStatus } from './oparl-sync-run.entity';
import {
  modifiedSinceFor,
  nextSyncAfter,
  nextSyncKind,
} from './oparl-sync-schedule';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-23T12:00:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR);

describe('OParl sync schedule', () => {
  it('imports a system completely until an import succeeded', () => {
    expect(
      nextSyncKind(
        {
          lastFullSyncAt: null,
          lastDeltaSyncAt: hoursAgo(1),
        },
        now,
      ),
    ).toBe(OparlSyncKind.INITIAL);
  });

  it('reconciles completely once a week and syncs deltas in between', () => {
    const state = {
      lastDeltaSyncAt: hoursAgo(24),
    };
    expect(
      nextSyncKind({ ...state, lastFullSyncAt: hoursAgo(6 * 24) }, now),
    ).toBe(OparlSyncKind.DELTA);
    expect(
      nextSyncKind({ ...state, lastFullSyncAt: hoursAgo(7 * 24) }, now),
    ).toBe(OparlSyncKind.FULL);
  });

  it('asks for changes since an hour before the latest successful sync started', () => {
    expect(
      modifiedSinceFor({
        lastFullSyncAt: hoursAgo(72),
        lastDeltaSyncAt: hoursAgo(24),
      }),
    ).toEqual(hoursAgo(25));
  });

  it('is due a day after a finished run started', () => {
    expect(
      nextSyncAfter(OparlSyncRunStatus.SUCCEEDED, hoursAgo(2), 0, now),
    ).toEqual(new Date(hoursAgo(2).getTime() + 24 * HOUR));
  });

  it('retries a failing system after 1, 2, 4 … hours, at most a day', () => {
    const after = (failures: number) =>
      (nextSyncAfter(
        OparlSyncRunStatus.FAILED,
        hoursAgo(1),
        failures,
        now,
      ).getTime() -
        now.getTime()) /
      HOUR;
    expect([1, 2, 3, 6, 10].map(after)).toEqual([1, 2, 4, 24, 24]);
  });
});
