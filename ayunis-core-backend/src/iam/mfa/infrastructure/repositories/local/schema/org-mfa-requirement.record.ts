import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'org_mfa_requirements' })
@Unique(['orgId'])
export class OrgMfaRequirementRecord extends BaseRecord {
  @Index()
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ default: false })
  required: boolean;
}
