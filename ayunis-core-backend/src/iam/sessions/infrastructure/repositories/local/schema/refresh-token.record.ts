import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenRecord extends BaseRecord {
  @Index()
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Index()
  @Column()
  familyId: UUID;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  replacedByTokenId: UUID | null;

  // SET NULL (not CASCADE): the successor may be cleaned up before its
  // predecessor without erasing the predecessor's audit trail row.
  @ManyToOne(() => RefreshTokenRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replacedByTokenId' })
  replacedByToken: RefreshTokenRecord | null;
}
