import type { UUID } from 'crypto';
import { Check, Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { SsoConnectionStatus } from 'src/iam/sso/domain/value-objects/sso-connection-status.enum';
import { SsoProvisioningMode } from 'src/iam/sso/domain/value-objects/sso-provisioning-mode.enum';

const DOMAIN_PATTERN =
  '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$';

@Entity({ name: 'org_sso_connections' })
@Unique(['verifiedEmailDomain'])
@Unique(['brokerOrgId'])
@Check('"emailDomain" = lower(btrim("emailDomain"))')
@Check(`"emailDomain" ~ '${DOMAIN_PATTERN}'`)
@Check(
  '"verifiedEmailDomain" IS NULL OR "verifiedEmailDomain" = lower(btrim("verifiedEmailDomain"))',
)
@Check(
  `"verifiedEmailDomain" IS NULL OR "verifiedEmailDomain" ~ '${DOMAIN_PATTERN}'`,
)
@Check('("verifiedEmailDomain" IS NULL) = ("domainVerifiedAt" IS NULL)')
@Check(
  '"brokerOrgId" IS NULL OR ("brokerOrgId" <> \'\' AND "brokerOrgId" = btrim("brokerOrgId"))',
)
@Check(
  '"status" <> \'active\' OR ("verifiedEmailDomain" IS NOT NULL AND "verifiedEmailDomain" = "emailDomain")',
)
@Check('NOT "enabled" OR ("status" = \'active\' AND "brokerOrgId" IS NOT NULL)')
export class OrgSsoConnectionRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @OneToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', length: 253 })
  emailDomain: string;

  @Column({ type: 'varchar', length: 253, nullable: true })
  verifiedEmailDomain: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  domainVerifiedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  brokerOrgId: string | null;

  @Column({
    type: 'enum',
    enum: SsoConnectionStatus,
    default: SsoConnectionStatus.DRAFT,
  })
  status: SsoConnectionStatus;

  @Column({ default: false })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: SsoProvisioningMode,
    default: SsoProvisioningMode.INVITE_ONLY,
  })
  provisioningMode: SsoProvisioningMode;
}
