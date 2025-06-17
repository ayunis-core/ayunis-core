import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { PermittedModelRecord } from '../../local-permitted-models/schema/permitted-model.record';

@Entity({ name: 'user_default_models' })
export class UserDefaultModelRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  userId: UUID;

  @ManyToOne(() => PermittedModelRecord, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  model: PermittedModelRecord;
}
