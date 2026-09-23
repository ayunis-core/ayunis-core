import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';

@Entity({ name: 'invite_teams' })
@Index(['inviteId'])
@Index(['teamId'])
@Unique(['inviteId', 'teamId'])
export class InviteTeamRecord extends BaseRecord {
  @Column({ name: 'invite_id' })
  inviteId: UUID;

  @ManyToOne(() => InviteRecord, (invite) => invite.inviteTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invite_id' })
  invite: InviteRecord;

  @Column({ name: 'team_id' })
  teamId: UUID;

  @ManyToOne(() => TeamRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: TeamRecord;
}
