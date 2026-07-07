import { randomUUID, type UUID } from 'crypto';
import type { BudgetAlertScope } from './value-objects/budget-alert-scope.enum';

/**
 * Idempotency marker recording that org admins were notified about a budget
 * threshold crossing. One row per (org, scope, target, period, threshold);
 * its presence means "already notified", so the daily job never re-sends the
 * same warning within a billing period.
 *
 * `targetId` is the org id for ORG scope and the user/team id otherwise, so it
 * is always set (never null) and can back a single unique index.
 */
export class BudgetAlertNotification {
  id: UUID;
  orgId: UUID;
  scope: BudgetAlertScope;
  targetId: UUID;
  threshold: number;
  periodStart: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    scope: BudgetAlertScope;
    targetId: UUID;
    threshold: number;
    periodStart: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.scope = params.scope;
    this.targetId = params.targetId;
    this.threshold = params.threshold;
    this.periodStart = params.periodStart;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
