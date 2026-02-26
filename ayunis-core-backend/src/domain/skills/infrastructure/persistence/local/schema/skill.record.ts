import {
  Column,
  Entity,
  ManyToOne,
  ManyToMany,
  JoinTable,
  Unique,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';
import { McpIntegrationRecord } from '../../../../../mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseRecord } from '../../../../../knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Entity({ name: 'skills' })
@Unique('UQ_skill_name_userId', ['name', 'userId'])
export class SkillRecord extends BaseRecord {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  shortDescription: string;

  @Column({ nullable: false })
  instructions: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  marketplaceIdentifier: string | null;

  @Column({ nullable: false })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

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
