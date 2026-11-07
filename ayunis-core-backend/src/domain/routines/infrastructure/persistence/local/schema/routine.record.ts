import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import {
  ROUTINE_FAILURE_REASON_MAX_LENGTH,
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';

@Entity({ name: 'routines' })
export class RoutineRecord extends BaseRecord {
  @Column({ type: 'varchar', length: ROUTINE_NAME_MAX_LENGTH })
  name: string;

  @Column({ type: 'varchar', length: ROUTINE_PROMPT_MAX_LENGTH })
  prompt: string;

  /** Deleting the user deletes their routines. */
  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  /** Removing the permit keeps the routine; it then runs with the owner's default. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  modelId: UUID | null;

  @ManyToOne(() => PermittedModelRecord, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'modelId' })
  model?: PermittedModelRecord;

  @Column({ type: 'varchar', length: 5 })
  dailyTime: string;

  @Column({ default: false })
  internetEnabled: boolean;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'enum', enum: RoutineRunStatus, nullable: true })
  lastRunStatus: RoutineRunStatus | null;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({
    type: 'varchar',
    length: ROUTINE_FAILURE_REASON_MAX_LENGTH,
    nullable: true,
  })
  lastRunFailureReason: string | null;

  @Column({ type: 'int', default: 0 })
  consecutiveFailureCount: number;
}
