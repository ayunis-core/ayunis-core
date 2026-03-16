import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'ip_allowlists' })
export class IpAllowlistRecord extends BaseRecord {
  @Column({ unique: true })
  orgId: UUID;

  @Column({ type: 'text', array: true })
  cidrs: string[];

  @OneToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;
}
