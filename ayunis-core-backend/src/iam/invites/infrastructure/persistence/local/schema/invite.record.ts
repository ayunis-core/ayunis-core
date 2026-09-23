import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { InviteTeamRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite-team.record';

@Entity({ name: 'invites' })
export class InviteRecord extends BaseRecord {
  @Column({ unique: true })
  email: string;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    nullable: true,
  })
  inviterId?: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  inviter?: UserRecord;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @Column()
  expiresAt: Date;

  @OneToMany(() => InviteTeamRecord, (inviteTeam) => inviteTeam.invite, {
    cascade: ['insert'],
  })
  inviteTeams?: InviteTeamRecord[];
}
