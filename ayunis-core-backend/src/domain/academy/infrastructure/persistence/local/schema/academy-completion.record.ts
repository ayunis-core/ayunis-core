import { UUID } from 'crypto';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'academy_completion' })
@Unique('UQ_academy_completion_userId', ['userId'])
export class AcademyCompletionRecord extends BaseRecord {
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

  @Column({ nullable: false, type: 'timestamp' })
  completedAt: Date;
}
