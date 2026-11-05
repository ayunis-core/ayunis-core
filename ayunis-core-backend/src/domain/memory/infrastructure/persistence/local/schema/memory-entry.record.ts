import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import {
  MEMORY_DESCRIPTION_MAX_LENGTH,
  MEMORY_KEY_MAX_LENGTH,
} from 'src/domain/memory/domain/memory.constants';

@Entity({ name: 'user_memory_entries' })
@Unique(['userId', 'key'])
export class MemoryEntryRecord extends BaseRecord {
  // No separate index on userId: the (userId, key) unique constraint already
  // indexes it as the leading column, for lookups and for the FK cascade.
  @Column({ nullable: false })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'varchar', length: MEMORY_KEY_MAX_LENGTH, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({
    type: 'varchar',
    length: MEMORY_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description: string | null;
}
