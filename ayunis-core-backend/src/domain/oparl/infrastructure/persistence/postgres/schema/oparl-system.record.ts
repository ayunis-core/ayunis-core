import { Column, Entity, Index } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OparlSyncRunStatus } from 'src/domain/oparl/domain/oparl-sync-run.entity';

@Entity({ name: 'oparl_systems' })
export class OparlSystemRecord extends BaseRecord {
  @Column({ type: 'text', unique: true })
  url: string;

  @Column({ type: 'text', unique: true })
  oparlId: string;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  vendor: string | null;

  @Column({ type: 'text', nullable: true })
  product: string | null;

  @Column({ type: 'text', nullable: true })
  oparlVersion: string | null;

  @Column({ type: 'text', nullable: true })
  website: string | null;

  @Column({ type: 'jsonb' })
  raw: object;

  @Index()
  @Column({ type: 'timestamptz' })
  nextSyncAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastDeltaSyncAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastFullSyncAt: Date | null;

  @Column({ type: 'enum', enum: OparlSyncRunStatus, nullable: true })
  lastRunStatus: OparlSyncRunStatus | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunFinishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'integer', default: 0 })
  consecutiveFailures: number;
}
