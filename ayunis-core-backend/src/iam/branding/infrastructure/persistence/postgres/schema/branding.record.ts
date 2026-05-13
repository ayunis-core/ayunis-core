import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'branding' })
export class BrandingRecord extends BaseRecord {
  @Column({ unique: true })
  orgId: UUID;

  @Column({ nullable: true, type: 'varchar' })
  displayName: string | null;

  @Column({ nullable: true, type: 'varchar' })
  faviconStoragePath: string | null;

  @Column({ nullable: true, type: 'varchar' })
  primaryColor: string | null;

  @OneToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;
}
