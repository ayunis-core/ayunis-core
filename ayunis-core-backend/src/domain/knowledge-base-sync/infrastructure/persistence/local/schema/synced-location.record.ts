import type { UUID } from 'crypto';
import {
  Check,
  ChildEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  TableInheritance,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { ConnectorRecord } from 'src/domain/connectors/infrastructure/persistence/local/schema/connector.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

// The unique constraint leads with knowledgeBaseId and so also serves the
// knowledge base's FK cascade.
@Entity({ name: 'knowledge_base_synced_locations' })
@TableInheritance({ column: { type: 'varchar', name: 'provider' } })
@Unique(['knowledgeBaseId', 'provider', 'location'])
@Check(
  `("provider" = '${SyncedLocationProvider.CONNECTOR}') = ("connectorId" IS NOT NULL)`,
)
export abstract class SyncedLocationRecord extends BaseRecord {
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

// Nullable for the rows of other providers, which share the table; the check
// constraint requires it exactly for connector locations.
@ChildEntity(SyncedLocationProvider.CONNECTOR)
export class ConnectorSyncedLocationRecord extends SyncedLocationRecord {
  // The connector outlives a removed connection, so this cascade only runs
  // with the organization.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  connectorId: UUID | null;

  @ManyToOne(() => ConnectorRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connectorId' })
  connector: ConnectorRecord | null;
}
