import type { UUID } from 'crypto';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity('sso_login_transactions')
@Unique(['stateHash'])
@Check(
  `(purpose = 'login' AND link_user_id IS NULL) OR (purpose = 'link' AND link_user_id IS NOT NULL)`,
)
export class SsoLoginTransactionRecord extends BaseRecord {
  @Column({ name: 'state_hash', type: 'varchar', length: 64 })
  stateHash: string;

  @Column({ name: 'browser_binding_hash', type: 'varchar', length: 64 })
  browserBindingHash: string;

  @Column({ name: 'post_login_path', type: 'varchar', length: 255 })
  postLoginPath: string;

  @Column({ name: 'encrypted_code_verifier', type: 'text' })
  encryptedCodeVerifier: string;

  @Column({ name: 'encrypted_nonce', type: 'text' })
  encryptedNonce: string;

  @Column({ name: 'org_id', type: 'varchar' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: OrgRecord;

  @Column({ name: 'zitadel_org_id', type: 'varchar', length: 255 })
  zitadelOrgId: string;

  @Column({
    type: 'enum',
    enum: SsoLoginPurpose,
    default: SsoLoginPurpose.LOGIN,
  })
  purpose: SsoLoginPurpose;

  @Column({ name: 'link_user_id', type: 'varchar', nullable: true })
  linkUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_user_id' })
  linkUser: UserRecord | null;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt?: Date;
}
