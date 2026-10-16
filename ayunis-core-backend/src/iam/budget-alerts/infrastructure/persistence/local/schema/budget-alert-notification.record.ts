import {
  Check,
  ChildEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  TableInheritance,
} from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';
import { BudgetAlertScope } from 'src/iam/budget-alerts/domain/value-objects/budget-alert-scope.enum';

/**
 * One row per budget target and threshold crossing. The STI discriminator
 * selects the target subtype; orgId is the organization target, while userId,
 * teamId and apiKeyId belong only to their respective child records.
 */
@Entity('budget_alert_notifications')
@TableInheritance({ column: { type: 'varchar', name: 'scope' } })
@Check(
  'CHK_budget_alert_notifications_scope_targets',
  `(
    ("scope" = 'org' AND "userId" IS NULL AND "teamId" IS NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'user' AND "userId" IS NOT NULL AND "teamId" IS NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'team' AND "userId" IS NULL AND "teamId" IS NOT NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'api_key' AND "userId" IS NULL AND "teamId" IS NULL AND "apiKeyId" IS NOT NULL)
  )`,
)
export abstract class BudgetAlertNotificationRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column('int')
  threshold: number;

  @Column({ type: 'timestamptz' })
  periodStart: Date;
}

@ChildEntity(BudgetAlertScope.ORG)
@Index(['orgId', 'periodStart', 'threshold'], {
  unique: true,
  where: `"scope" = 'org'`,
})
export class OrgBudgetAlertNotificationRecord extends BudgetAlertNotificationRecord {}

@ChildEntity(BudgetAlertScope.USER)
@Index(['orgId', 'userId', 'periodStart', 'threshold'], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
export class UserBudgetAlertNotificationRecord extends BudgetAlertNotificationRecord {
  @Column({ nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  user: UserRecord | null;
}

@ChildEntity(BudgetAlertScope.TEAM)
@Index(['orgId', 'teamId', 'periodStart', 'threshold'], {
  unique: true,
  where: '"teamId" IS NOT NULL',
})
export class TeamBudgetAlertNotificationRecord extends BudgetAlertNotificationRecord {
  @Column({ nullable: true })
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  team: TeamRecord | null;
}

@ChildEntity(BudgetAlertScope.API_KEY)
@Index(['orgId', 'apiKeyId', 'periodStart', 'threshold'], {
  unique: true,
  where: '"apiKeyId" IS NOT NULL',
})
export class ApiKeyBudgetAlertNotificationRecord extends BudgetAlertNotificationRecord {
  @Column({ nullable: true })
  apiKeyId: UUID | null;

  @ManyToOne(() => ApiKeyRecord, { nullable: true, onDelete: 'CASCADE' })
  apiKey: ApiKeyRecord | null;
}
