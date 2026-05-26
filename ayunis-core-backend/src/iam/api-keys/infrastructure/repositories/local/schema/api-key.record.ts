import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { OrgRecord } from '../../../../../orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from '../../../../../users/infrastructure/repositories/local/schema/user.record';

@Entity({ name: 'api_keys' })
export class ApiKeyRecord extends BaseRecord {
  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column()
  prefix: string;

  @Column()
  hash: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Index()
  @Column({ name: 'org_id' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: OrgRecord;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: UserRecord | null;
}
