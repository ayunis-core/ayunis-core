import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

@Entity({ name: 'global_anonymization_whitelist_words' })
@Unique(['category', 'wordLowercase'])
export class GlobalAnonymizationWhitelistWordRecord extends BaseRecord {
  @Column({ type: 'enum', enum: PiiCategory })
  category: PiiCategory;

  @Column({ type: 'text' })
  word: string;

  // Normalized duplicate of `word` so uniqueness is case-insensitive without
  // an expression index (which TypeORM decorators cannot express).
  @Column({ type: 'text' })
  wordLowercase: string;

  @Column({ nullable: true })
  createdByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: UserRecord | null;
}
