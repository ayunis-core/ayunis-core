import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { ConnectorRecord } from 'src/domain/connectors/infrastructure/persistence/local/schema/connector.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

// The unique constraint leads with knowledgeBaseId and so also serves the
// knowledge base's FK cascade.
@Entity({ name: 'knowledge_base_synced_locations' })
@Unique(['knowledgeBaseId', 'connectorId', 'location'])
export class SyncedLocationRecord extends BaseRecord {
  @Index()
  @Column({ type: 'uuid' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'uuid' })
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;

  // The connector outlives a removed connection, so this cascade only runs
  // with the organization.
  @Index()
  @Column({ type: 'uuid' })
  connectorId: UUID;

  @ManyToOne(() => ConnectorRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connectorId' })
  connector: ConnectorRecord;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text', nullable: true })
  cursor: string | null;

  @Column({
    type: 'enum',
    enum: SyncedLocationState,
    default: SyncedLocationState.ACTIVE,
  })
  state: SyncedLocationState;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  nextSyncAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  syncingSince: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  pausedUntil: Date | null;
}
