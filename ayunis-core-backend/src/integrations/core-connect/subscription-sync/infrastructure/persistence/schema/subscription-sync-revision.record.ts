import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity('subscription_sync_revisions')
export class SubscriptionSyncRevisionRecord {
  @PrimaryColumn({ type: 'varchar' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'uuid' })
  revision: UUID;
}
