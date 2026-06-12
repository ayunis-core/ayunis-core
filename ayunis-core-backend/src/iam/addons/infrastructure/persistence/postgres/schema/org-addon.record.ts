import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

@Entity({ name: 'org_addons' })
@Unique(['orgId', 'type'])
export class OrgAddonRecord extends BaseRecord {
  @Column({ type: 'varchar' })
  type: AddonType;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;
}
