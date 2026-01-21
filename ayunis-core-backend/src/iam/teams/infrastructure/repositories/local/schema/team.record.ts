import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'teams' })
@Index(['orgId', 'name'], { unique: true })
export class TeamRecord extends BaseRecord {
  @Column()
  name: string;

  @Column({ name: 'org_id' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: OrgRecord;
}
