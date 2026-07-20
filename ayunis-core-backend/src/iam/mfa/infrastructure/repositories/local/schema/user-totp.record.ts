import { Column, Entity, Index, JoinColumn, OneToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'user_totps' })
@Unique(['userId'])
export class UserTotpRecord extends BaseRecord {
  @Index()
  @Column()
  userId: UUID;

  @OneToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'text' })
  encryptedSecret: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'int', nullable: true })
  lastUsedCounter: number | null;
}
