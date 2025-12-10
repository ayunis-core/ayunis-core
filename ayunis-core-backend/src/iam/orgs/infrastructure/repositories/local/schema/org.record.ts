import { Column, Entity, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'orgs' })
export class OrgRecord extends BaseRecord {
  @Column()
  name: string;

  @OneToMany(() => UserRecord, (user) => user.org, {
    cascade: true,
    nullable: false,
  })
  users: UserRecord[];
}
