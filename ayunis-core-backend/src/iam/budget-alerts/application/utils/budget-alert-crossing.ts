import type { UUID } from 'crypto';
import { BudgetAlertScope } from 'src/iam/budget-alerts/domain/value-objects/budget-alert-scope.enum';

const WARNING_THRESHOLDS_BY_SCOPE: Record<BudgetAlertScope, readonly number[]> =
  {
    [BudgetAlertScope.ORG]: [50, 80, 100],
    [BudgetAlertScope.USER]: [80, 100],
    [BudgetAlertScope.TEAM]: [80, 100],
    [BudgetAlertScope.API_KEY]: [80, 100],
  };

// Late in the month the remaining days make a 50% heads-up meaningless, so it
// is only sent through this day of the (UTC) budget period.
const HALF_BUDGET_WARNING_THRESHOLD = 50;
const HALF_BUDGET_WARNING_LAST_DAY_OF_MONTH = 20;

export interface BudgetTarget {
  scope: BudgetAlertScope;
  targetId: UUID;
  name: string;
  monthlyCredits: number;
  creditsUsed: number;
}

export interface BudgetCrossing {
  target: BudgetTarget;
  emailThreshold: number;
  recordThresholds: number[];
}

export function notificationKey(
  scope: BudgetAlertScope,
  targetId: UUID,
  threshold: number,
): string {
  return `${scope}:${targetId}:${threshold}`;
}

/**
 * Given the configured limits/spend of each target and the set of already-sent
 * notification keys, returns the crossings that still need an email. A target
 * with no positive limit (unlimited or frozen) never crosses.
 */
export function collectCrossings(
  targets: BudgetTarget[],
  sentKeys: ReadonlySet<string>,
  now: Date,
): BudgetCrossing[] {
  const crossings: BudgetCrossing[] = [];
  for (const target of targets) {
    const crossing = evaluateTarget(target, sentKeys, now);
    if (crossing) {
      crossings.push(crossing);
    }
  }
  return crossings;
}

function activeThresholds(scope: BudgetAlertScope, now: Date): number[] {
  const halfBudgetWarningActive =
    now.getUTCDate() <= HALF_BUDGET_WARNING_LAST_DAY_OF_MONTH;
  return WARNING_THRESHOLDS_BY_SCOPE[scope].filter(
    (threshold) =>
      halfBudgetWarningActive || threshold !== HALF_BUDGET_WARNING_THRESHOLD,
  );
}

function evaluateTarget(
  target: BudgetTarget,
  sentKeys: ReadonlySet<string>,
  now: Date,
): BudgetCrossing | null {
  if (target.monthlyCredits <= 0) {
    return null;
  }
  const percentUsed = (target.creditsUsed / target.monthlyCredits) * 100;
  const recordThresholds = activeThresholds(target.scope, now).filter(
    (threshold) =>
      percentUsed >= threshold &&
      !sentKeys.has(notificationKey(target.scope, target.targetId, threshold)),
  );
  if (recordThresholds.length === 0) {
    return null;
  }
  return {
    target,
    emailThreshold: Math.max(...recordThresholds),
    recordThresholds,
  };
}
