import type { UUID } from 'crypto';
import { BudgetAlertScope } from '../../domain/value-objects/budget-alert-scope.enum';

const WARNING_THRESHOLDS_BY_SCOPE: Record<BudgetAlertScope, readonly number[]> =
  {
    [BudgetAlertScope.ORG]: [50, 80, 100],
    [BudgetAlertScope.USER]: [80, 100],
    [BudgetAlertScope.TEAM]: [80, 100],
  };

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
): BudgetCrossing[] {
  const crossings: BudgetCrossing[] = [];
  for (const target of targets) {
    const crossing = evaluateTarget(target, sentKeys);
    if (crossing) {
      crossings.push(crossing);
    }
  }
  return crossings;
}

function evaluateTarget(
  target: BudgetTarget,
  sentKeys: ReadonlySet<string>,
): BudgetCrossing | null {
  if (target.monthlyCredits <= 0) {
    return null;
  }
  const percentUsed = (target.creditsUsed / target.monthlyCredits) * 100;
  const recordThresholds = WARNING_THRESHOLDS_BY_SCOPE[target.scope].filter(
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
