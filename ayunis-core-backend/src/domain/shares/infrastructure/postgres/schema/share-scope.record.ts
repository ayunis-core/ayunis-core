import {
  Entity,
  TableInheritance,
  ChildEntity,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UUID } from 'crypto';

@Entity('share_scopes')
@TableInheritance({
  column: { type: 'enum', enum: ShareScopeType, name: 'scope_type' },
})
export class ShareScopeRecord extends BaseRecord {}

@ChildEntity(ShareScopeType.ORG)
export class OrgShareScopeRecord extends ShareScopeRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;
}

@ChildEntity(ShareScopeType.TEAM)
export class TeamShareScopeRecord extends ShareScopeRecord {
  @Column({ name: 'team_id' })
  teamId: UUID;

  @ManyToOne(() => TeamRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: TeamRecord;
}
