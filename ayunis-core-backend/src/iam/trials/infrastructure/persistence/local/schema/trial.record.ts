import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Entity, Column, Index, ManyToOne } from 'typeorm';

@Entity({ name: 'trials' })
export class TrialRecord extends BaseRecord {
  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column()
  @Index()
  orgId: UUID;

  @Column({ default: 0 })
  messagesSent: number;

  @Column()
  maxMessages: number;
}
