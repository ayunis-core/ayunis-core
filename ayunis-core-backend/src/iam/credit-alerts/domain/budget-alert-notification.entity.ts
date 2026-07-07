import { randomUUID, type UUID } from 'crypto';
import { BudgetAlertScope } from './value-objects/budget-alert-scope.enum';

export interface BudgetAlertNotificationParams {
  id?: UUID;
  orgId: UUID;
  threshold: number;
  periodStart: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class BudgetAlertNotification {
  readonly id: UUID;
  readonly orgId: UUID;
  readonly threshold: number;
  readonly periodStart: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: BudgetAlertNotificationParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.threshold = params.threshold;
    this.periodStart = params.periodStart;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  abstract get scope(): BudgetAlertScope;
  abstract get targetId(): UUID;
}

export class OrgBudgetAlertNotification extends BudgetAlertNotification {
  get scope(): BudgetAlertScope {
    return BudgetAlertScope.ORG;
  }

  get targetId(): UUID {
    return this.orgId;
  }
}

export class UserBudgetAlertNotification extends BudgetAlertNotification {
  readonly userId: UUID;

  constructor(params: BudgetAlertNotificationParams & { userId: UUID }) {
    super(params);
    this.userId = params.userId;
  }

  get scope(): BudgetAlertScope {
    return BudgetAlertScope.USER;
  }

  get targetId(): UUID {
    return this.userId;
  }
}

export class TeamBudgetAlertNotification extends BudgetAlertNotification {
  readonly teamId: UUID;

  constructor(params: BudgetAlertNotificationParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }

  get scope(): BudgetAlertScope {
    return BudgetAlertScope.TEAM;
  }

  get targetId(): UUID {
    return this.teamId;
  }
}
