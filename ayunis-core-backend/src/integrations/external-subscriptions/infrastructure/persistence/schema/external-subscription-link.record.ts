import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity('fynn_org_links')
export class ExternalSubscriptionLinkRecord {
  @PrimaryColumn({ type: 'varchar' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ name: 'customerId', type: 'varchar' })
  @Index()
  ownerId: string;
}
