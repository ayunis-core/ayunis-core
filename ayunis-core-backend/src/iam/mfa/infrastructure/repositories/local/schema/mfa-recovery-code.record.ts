import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'mfa_recovery_codes' })
export class MfaRecoveryCodeRecord extends BaseRecord {
  @Index()
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  codeHash: string;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
