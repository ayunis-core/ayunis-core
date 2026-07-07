import { Entity, Column, Index, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { BudgetAlertScope } from '../../../../domain/value-objects/budget-alert-scope.enum';

/**
 * One row per admin-notification about a budget threshold crossing. The unique
 * index makes the daily job idempotent within a billing period. `targetId` is
 * polymorphic (org / user / team id) so it carries no FK of its own; only
 * `orgId` is a real foreign key.
 */
@Entity('budget_alert_notifications')
@Index(['orgId', 'scope', 'targetId', 'periodStart', 'threshold'], {
  unique: true,
})
export class BudgetAlertNotificationRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: BudgetAlertScope })
  scope: BudgetAlertScope;

  @Column('uuid')
  targetId: UUID;

  @Column('int')
  threshold: number;

  @Column({ type: 'timestamptz' })
  periodStart: Date;
}
