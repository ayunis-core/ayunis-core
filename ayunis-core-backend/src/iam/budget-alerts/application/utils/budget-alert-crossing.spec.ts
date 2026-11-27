import type { UUID } from 'crypto';
import { BudgetAlertScope } from 'src/iam/budget-alerts/domain/value-objects/budget-alert-scope.enum';
import {
  collectCrossings,
  notificationKey,
  type BudgetTarget,
} from './budget-alert-crossing';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
const midMonth = new Date('2026-07-10T12:00:00.000Z');

function orgTarget(overrides: Partial<BudgetTarget> = {}): BudgetTarget {
  return {
    scope: BudgetAlertScope.ORG,
    targetId: orgId,
    name: '',
    monthlyCredits: 1000,
    creditsUsed: 0,
    ...overrides,
  };
}

describe('collectCrossings', () => {
  it('returns no crossing below the lowest threshold', () => {
    const result = collectCrossings(
      [orgTarget({ creditsUsed: 490 })],
      new Set(),
      midMonth,
    );
    expect(result).toEqual([]);
  });

  it('emails and records only the 50% threshold between 50% and 80%', () => {
    const result = collectCrossings(
      [orgTarget({ creditsUsed: 550 })],
      new Set(),
      midMonth,
    );

    expect(result).toHaveLength(1);
    expect(result[0].emailThreshold).toBe(50);
    expect(result[0].recordThresholds).toEqual([50]);
  });

  it('emails 80% but records both 50 and 80 when both are crossed at once', () => {
    const result = collectCrossings(
      [orgTarget({ creditsUsed: 830 })],
      new Set(),
      midMonth,
    );

    expect(result[0].emailThreshold).toBe(80);
    expect(result[0].recordThresholds).toEqual([50, 80]);
  });

  it('does not re-fire a threshold already recorded this period', () => {
    const sent = new Set([notificationKey(BudgetAlertScope.ORG, orgId, 50)]);

    const result = collectCrossings(
      [orgTarget({ creditsUsed: 550 })],
      sent,
      midMonth,
    );

    expect(result).toEqual([]);
  });

  it('emails 80% only when 50% was already sent earlier', () => {
    const sent = new Set([notificationKey(BudgetAlertScope.ORG, orgId, 50)]);

    const result = collectCrossings(
      [orgTarget({ creditsUsed: 830 })],
      sent,
      midMonth,
    );

    expect(result[0].emailThreshold).toBe(80);
    expect(result[0].recordThresholds).toEqual([80]);
  });

  it('emails 100% and records all thresholds when the budget is fully used at once', () => {
    const result = collectCrossings(
      [orgTarget({ creditsUsed: 1000 })],
      new Set(),
      midMonth,
    );

    expect(result[0].emailThreshold).toBe(100);
    expect(result[0].recordThresholds).toEqual([50, 80, 100]);
  });

  it('emails 100% only when 50% and 80% were already sent earlier', () => {
    const sent = new Set([
      notificationKey(BudgetAlertScope.ORG, orgId, 50),
      notificationKey(BudgetAlertScope.ORG, orgId, 80),
    ]);

    const result = collectCrossings(
      [orgTarget({ creditsUsed: 1200 })],
      sent,
      midMonth,
    );

    expect(result[0].emailThreshold).toBe(100);
    expect(result[0].recordThresholds).toEqual([100]);
  });

  it('does not re-fire the 100% threshold already recorded this period', () => {
    const sent = new Set([
      notificationKey(BudgetAlertScope.ORG, orgId, 50),
      notificationKey(BudgetAlertScope.ORG, orgId, 80),
      notificationKey(BudgetAlertScope.ORG, orgId, 100),
    ]);

    const result = collectCrossings(
      [orgTarget({ creditsUsed: 1500 })],
      sent,
      midMonth,
    );

    expect(result).toEqual([]);
  });

  it('does not fire a 50% warning for user limits', () => {
    const userId = '22222222-2222-2222-2222-222222222222' as UUID;
    const result = collectCrossings(
      [
        {
          scope: BudgetAlertScope.USER,
          targetId: userId,
          name: 'Jane Doe',
          monthlyCredits: 200,
          creditsUsed: 130,
        },
      ],
      new Set(),
      midMonth,
    );

    expect(result).toEqual([]);
  });

  it('does not fire a 50% warning for team limits', () => {
    const teamId = '33333333-3333-3333-3333-333333333333' as UUID;
    const result = collectCrossings(
      [
        {
          scope: BudgetAlertScope.TEAM,
          targetId: teamId,
          name: 'Engineering',
          monthlyCredits: 200,
          creditsUsed: 130,
        },
      ],
      new Set(),
      midMonth,
    );

    expect(result).toEqual([]);
  });

  it('records only 80 and 100 when a user limit is fully used at once', () => {
    const userId = '22222222-2222-2222-2222-222222222222' as UUID;
    const result = collectCrossings(
      [
        {
          scope: BudgetAlertScope.USER,
          targetId: userId,
          name: 'Jane Doe',
          monthlyCredits: 200,
          creditsUsed: 200,
        },
      ],
      new Set(),
      midMonth,
    );

    expect(result[0].emailThreshold).toBe(100);
    expect(result[0].recordThresholds).toEqual([80, 100]);
  });

  it('never crosses a frozen (zero) or unlimited (<=0) limit', () => {
    const result = collectCrossings(
      [orgTarget({ monthlyCredits: 0, creditsUsed: 500 })],
      new Set(),
      midMonth,
    );
    expect(result).toEqual([]);
  });

  it('evaluates each target independently', () => {
    const userId = '22222222-2222-2222-2222-222222222222' as UUID;
    const result = collectCrossings(
      [
        orgTarget({ creditsUsed: 100 }),
        {
          scope: BudgetAlertScope.USER,
          targetId: userId,
          name: 'Jane Doe',
          monthlyCredits: 200,
          creditsUsed: 180,
        },
      ],
      new Set(),
      midMonth,
    );

    expect(result).toHaveLength(1);
    expect(result[0].target.scope).toBe(BudgetAlertScope.USER);
    expect(result[0].emailThreshold).toBe(80);
  });

  it('warns for API key limits at 80 and 100 percent, not at 50', () => {
    const apiKeyId = '44444444-4444-4444-4444-444444444444' as UUID;
    const target = {
      scope: BudgetAlertScope.API_KEY,
      targetId: apiKeyId,
      name: 'Citizen portal',
      monthlyCredits: 200,
    };

    expect(
      collectCrossings([{ ...target, creditsUsed: 130 }], new Set(), midMonth),
    ).toEqual([]);
    expect(
      collectCrossings([{ ...target, creditsUsed: 200 }], new Set(), midMonth),
    ).toEqual([
      {
        target: { ...target, creditsUsed: 200 },
        emailThreshold: 100,
        recordThresholds: [80, 100],
      },
    ]);
  });

  describe('50% org warning cutoff after the 20th', () => {
    it('still emails the 50% warning until the end of the 20th', () => {
      const result = collectCrossings(
        [orgTarget({ creditsUsed: 550 })],
        new Set(),
        new Date('2026-07-20T23:59:59.999Z'),
      );

      expect(result[0].emailThreshold).toBe(50);
      expect(result[0].recordThresholds).toEqual([50]);
    });

    it('suppresses the 50% warning from the 21st on', () => {
      const result = collectCrossings(
        [orgTarget({ creditsUsed: 550 })],
        new Set(),
        new Date('2026-07-21T00:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });

    it('suppresses the 50% warning on the last day of the month', () => {
      const result = collectCrossings(
        [orgTarget({ creditsUsed: 550 })],
        new Set(),
        new Date('2026-02-28T12:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });

    it('still emails 80% and 100% after the 20th', () => {
      const lateInMonth = new Date('2026-07-27T12:00:00.000Z');

      const at80 = collectCrossings(
        [orgTarget({ creditsUsed: 830 })],
        new Set(),
        lateInMonth,
      );
      const at100 = collectCrossings(
        [orgTarget({ creditsUsed: 1000 })],
        new Set(),
        lateInMonth,
      );

      expect(at80[0].emailThreshold).toBe(80);
      expect(at80[0].recordThresholds).toEqual([80]);
      expect(at100[0].emailThreshold).toBe(100);
      expect(at100[0].recordThresholds).toEqual([80, 100]);
    });
  });
});
