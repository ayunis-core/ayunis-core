import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';

@Entity({ name: 'org_academy_access_settings' })
export class OrgAcademyAccessSettingsRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({
    type: 'enum',
    enum: AcademyAccessMode,
    nullable: false,
    default: AcademyAccessMode.UNRESTRICTED,
  })
  mode: AcademyAccessMode;
}
