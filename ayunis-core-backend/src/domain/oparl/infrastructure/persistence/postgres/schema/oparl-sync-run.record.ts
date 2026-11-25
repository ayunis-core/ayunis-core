import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import {
  OparlSyncKind,
  OparlSyncRunStatus,
  type OparlSyncRunStats,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import { OparlSystemRecord } from './oparl-system.record';

@Entity({ name: 'oparl_sync_runs' })
@Index(['systemId', 'startedAt'])
export class OparlSyncRunRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  systemId: UUID;

  @ManyToOne(() => OparlSystemRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'systemId' })
  system: Relation<OparlSystemRecord>;

  @Column({ type: 'enum', enum: OparlSyncKind })
  kind: OparlSyncKind;

  @Column({ type: 'enum', enum: OparlSyncRunStatus })
  status: OparlSyncRunStatus;

  @Column({ type: 'timestamptz', nullable: true })
  modifiedSince: Date | null;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb' })
  stats: OparlSyncRunStats;
}
