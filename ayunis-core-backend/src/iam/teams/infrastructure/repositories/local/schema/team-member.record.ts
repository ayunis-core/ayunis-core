import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { TeamRecord } from './team.record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'team_members' })
@Index(['teamId'])
@Index(['userId'])
@Unique(['teamId', 'userId'])
export class TeamMemberRecord extends BaseRecord {
  @Column({ name: 'team_id' })
  teamId: UUID;

  @ManyToOne(() => TeamRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: TeamRecord;

  @Column({ name: 'user_id' })
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserRecord;
}
