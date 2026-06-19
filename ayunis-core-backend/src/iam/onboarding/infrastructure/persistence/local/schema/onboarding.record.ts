import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'onboarding' })
export class OnboardingRecord extends BaseRecord {
  @Column({ unique: true })
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  completedStepIds: string[];

  @Column({ default: false })
  hidden: boolean;
}
