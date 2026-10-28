import type { UUID } from 'crypto';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'favorites' })
@Unique(['userId', 'referenceType', 'referenceId'])
@Unique(['userId', 'position'])
@Check('"position" >= 0')
export class FavoriteRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ nullable: false, type: 'enum', enum: FavoriteReferenceType })
  referenceType: FavoriteReferenceType;

  @Column({ nullable: false })
  referenceId: UUID;

  @Column({ nullable: false, type: 'int' })
  position: number;
}
