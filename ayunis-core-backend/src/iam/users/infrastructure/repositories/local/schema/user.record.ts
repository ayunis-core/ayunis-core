import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { UserRole } from '../../../../domain/value-objects/role.object';
import { UUID } from 'crypto';

@Entity({ name: 'users' })
export class UserRecord extends BaseRecord {
  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  emailVerified: boolean;

  @Column({ nullable: false })
  name: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    type: 'uuid',
  })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, (org) => org.id, { nullable: false })
  org: OrgRecord;

  @Column({ default: false })
  hasAcceptedMarketing: boolean;
}
