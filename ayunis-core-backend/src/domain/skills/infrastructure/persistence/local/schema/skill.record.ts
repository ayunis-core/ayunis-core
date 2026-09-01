import {
  Check,
  Column,
  Entity,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

@Entity({ name: 'skills' })
@Check(
  'CHK_skills_exactly_one_owner',
  '("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL)',
)
@Index(['name', 'userId'], { unique: true, where: '"workspaceId" IS NULL' })
@Index(['name', 'workspaceId'], {
  unique: true,
  where: '"workspaceId" IS NOT NULL',
})
export class SkillRecord extends BaseRecord {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  shortDescription: string;

  @Column({ nullable: false })
  instructions: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  marketplaceIdentifier: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  user: UserRecord | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  originSkillId: UUID | null;

  @ManyToOne(() => SkillRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originSkillId' })
  originSkill: SkillRecord | null;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'integer', nullable: true })
  importedOriginVersion: number | null;

  @Column({ type: 'integer', nullable: true })
  dismissedOriginVersion: number | null;

  @ManyToMany(() => SourceRecord)
  @JoinTable({ name: 'skill_sources' })
  sources?: SourceRecord[];

  @ManyToMany(() => McpIntegrationRecord)
  @JoinTable({ name: 'skill_mcp_integrations' })
  mcpIntegrations?: McpIntegrationRecord[];

  @ManyToMany(() => KnowledgeBaseRecord)
  @JoinTable({ name: 'skill_knowledge_bases' })
  knowledgeBases?: KnowledgeBaseRecord[];
}
