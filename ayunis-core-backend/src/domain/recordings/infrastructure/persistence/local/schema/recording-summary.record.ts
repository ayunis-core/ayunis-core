import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { ModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { RecordingRecord } from './recording.record';

@Entity('recording_summaries')
export class RecordingSummaryRecord extends BaseRecord {
  @Column()
  recordingId: UUID;

  @OneToOne(() => RecordingRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'recordingId' })
  recording: RecordingRecord;

  @Column({ type: 'uuid' })
  runId: UUID;

  @Column({ type: 'enum', enum: RecordingSummaryStatus })
  status: RecordingSummaryStatus;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  triggeredByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggeredByUserId' })
  triggeredByUser: UserRecord | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  modelId: UUID | null;

  @ManyToOne(() => ModelRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'modelId' })
  model: ModelRecord | null;

  @Column({ type: 'varchar', nullable: true })
  modelName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  generatedAt: Date | null;

  @Column({ type: 'enum', enum: RecordingSummaryFailure, nullable: true })
  failure: RecordingSummaryFailure | null;
}
