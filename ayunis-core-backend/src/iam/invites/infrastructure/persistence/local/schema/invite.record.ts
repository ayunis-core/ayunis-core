import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { UserRole } from '../../../../../users/domain/value-objects/role.object';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'invites' })
export class InviteRecord extends BaseRecord {
  @Column({ unique: true })
  email: string;

  @Column({
    type: 'uuid',
  })
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
    type: 'uuid',
    nullable: true,
  })
  inviterId?: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  inviter?: UserRecord;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @Column()
  expiresAt: Date;
}
