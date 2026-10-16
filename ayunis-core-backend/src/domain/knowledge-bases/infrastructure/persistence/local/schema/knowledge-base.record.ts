import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import type { UUID } from 'crypto';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';

@Entity('knowledge_bases')
@Check(
  'CHK_knowledge_bases_exactly_one_owner',
  'num_nonnulls("userId", "workspaceId", "teamId") <= 1',
)
export class KnowledgeBaseRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord | null;

  @Column({ type: 'varchar', nullable: true })
  submittedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submittedByUserId' })
  submittedBy?: UserRecord | null;

  @OneToMany(() => SourceRecord, (source) => source.knowledgeBase)
  sources: SourceRecord[];
}
