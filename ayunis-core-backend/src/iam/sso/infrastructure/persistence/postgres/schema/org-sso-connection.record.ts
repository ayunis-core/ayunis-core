import type { UUID } from 'crypto';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { EMAIL_DOMAIN_PATTERN } from 'src/iam/sso/domain/sso-connection-values';
import { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';

@Entity({ name: 'org_sso_connections' })
@Unique(['emailDomain'])
@Unique(['zitadelOrgId'])
@Check('"emailDomain" = lower(btrim("emailDomain"))')
@Check(`"emailDomain" ~ '${EMAIL_DOMAIN_PATTERN}'`)
@Check(
  '"zitadelOrgId" IS NULL OR ("zitadelOrgId" <> \'\' AND "zitadelOrgId" = btrim("zitadelOrgId"))',
)
@Check('NOT "enabled" OR "zitadelOrgId" IS NOT NULL')
export class OrgSsoConnectionRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @OneToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', length: 253 })
  emailDomain: string;

  @Column({ type: 'timestamptz', nullable: false })
  domainVerifiedAt: Date;

  @OneToMany(
    () => OrgSsoEmailDomainRecord,
    (emailDomain) => emailDomain.connection,
    { cascade: ['insert'] },
  )
  emailDomains: OrgSsoEmailDomainRecord[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  zitadelOrgId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  zitadelIdpId: string | null;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: false })
  jitProvisioningEnabled: boolean;
}
