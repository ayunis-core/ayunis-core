import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'org_retention_policies' })
@Unique(['orgId'])
export class OrgRetentionPolicyRecord extends BaseRecord {
  @Index()
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  /** Days of inactivity before deletion; null disables retention. */
  @Column({ type: 'int', nullable: true })
  retentionDays: number | null;
}
