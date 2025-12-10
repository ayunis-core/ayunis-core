import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import { Column, Entity, ManyToOne, TableInheritance } from 'typeorm';
import { UUID } from 'crypto';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class ToolConfigRecord extends BaseRecord {
  @Column()
  displayName: string;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  user: UserRecord;

  @Column()
  userId: UUID;
}
