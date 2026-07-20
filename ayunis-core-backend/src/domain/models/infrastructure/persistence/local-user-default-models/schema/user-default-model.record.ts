import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PermittedModelRecord } from '../../local-permitted-models/schema/permitted-model.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'user_default_models' })
export class UserDefaultModelRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @ManyToOne(() => PermittedModelRecord, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  model: PermittedModelRecord;
}
