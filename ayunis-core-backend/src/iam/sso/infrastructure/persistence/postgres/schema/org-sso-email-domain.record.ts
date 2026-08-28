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
import { EMAIL_DOMAIN_PATTERN } from 'src/iam/sso/domain/sso-connection-values';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';

@Entity({ name: 'org_sso_email_domains' })
@Unique(['emailDomain'])
@Check('"emailDomain" = lower(btrim("emailDomain"))')
@Check(`"emailDomain" ~ '${EMAIL_DOMAIN_PATTERN}'`)
export class OrgSsoEmailDomainRecord extends BaseRecord {
  @Index()
  @Column()
  orgSsoConnectionId: UUID;

  @ManyToOne(
    () => OrgSsoConnectionRecord,
    (connection) => connection.emailDomains,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'orgSsoConnectionId' })
  connection: OrgSsoConnectionRecord;

  @Column({ type: 'varchar', length: 253 })
  emailDomain: string;

  @Column({ type: 'timestamptz', nullable: false })
  verifiedAt: Date;
}
