import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { WorkspaceRecord } from './workspace.record';

@Entity({ name: 'workspace_source_assignments' })
@Unique(['workspaceId', 'sourceId'])
export class WorkspaceSourceAssignmentRecord extends BaseRecord {
  @Column()
  @Index()
  workspaceId: UUID;

  @ManyToOne(() => WorkspaceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord;

  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source: SourceRecord;
}
