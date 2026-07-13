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
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from '../../../../../teams/infrastructure/repositories/local/schema/team.record';
import { BudgetAlertScope } from '../../../../domain/value-objects/budget-alert-scope.enum';

/**
 * One row per budget target and threshold crossing. The STI discriminator
 * selects the target subtype; orgId is the organization target, while userId
 * and teamId belong only to their respective child records.
 */
@Entity('budget_alert_notifications')
@TableInheritance({ column: { type: 'varchar', name: 'scope' } })
@Check(
  'CHK_budget_alert_notifications_target_columns',
  `(
    ("scope" = 'org' AND "userId" IS NULL AND "teamId" IS NULL)
    OR
    ("scope" = 'user' AND "userId" IS NOT NULL AND "teamId" IS NULL)
    OR
    ("scope" = 'team' AND "userId" IS NULL AND "teamId" IS NOT NULL)
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
