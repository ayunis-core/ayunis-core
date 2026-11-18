import {
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
import { SingleOwnerCheck } from 'src/domain/ownership/infrastructure/persistence/single-owner-check.decorator';

@Entity('knowledge_bases')
@SingleOwnerCheck('knowledge_bases')
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

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord | null;

  // Every knowledge base carries its tenant in orgId, so organization
  // ownership needs its own marker rather than "no other owner".
  @Column({ default: false })
  isOrgOwned: boolean;

  // Only authoritative for team- and org-owned knowledge bases, whose state is
  // global. Personal and workspace state lives in knowledge_base_activations.
  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => SourceRecord, (source) => source.knowledgeBase)
  sources: SourceRecord[];
}
