import { Column, Entity, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'onboarding' })
export class OnboardingRecord extends BaseRecord {
  @Column({ unique: true })
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  user: UserRecord;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  completedStepIds: string[];

  @Column({ default: false })
  hidden: boolean;
}
