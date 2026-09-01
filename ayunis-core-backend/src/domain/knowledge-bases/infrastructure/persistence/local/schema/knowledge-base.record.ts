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

@Entity('knowledge_bases')
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

  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  originKnowledgeBaseId: UUID | null;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'originKnowledgeBaseId' })
  originKnowledgeBase: KnowledgeBaseRecord | null;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'integer', nullable: true })
  importedOriginVersion: number | null;

  @Column({ type: 'integer', nullable: true })
  dismissedOriginVersion: number | null;

  @OneToMany(() => SourceRecord, (source) => source.knowledgeBase)
  sources: SourceRecord[];
}
