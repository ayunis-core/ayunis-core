import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';

@Injectable()
export class OrgSsoConnectionMapper {
  toDomain(record: OrgSsoConnectionRecord): OrgSsoConnection {
    return new OrgSsoConnection({
      id: record.id,
      orgId: record.orgId,
      emailDomains:
        record.emailDomains.length > 0
          ? record.emailDomains.map(({ emailDomain, verifiedAt }) => ({
              emailDomain,
              verifiedAt,
            }))
          : [
              {
                emailDomain: record.emailDomain,
                verifiedAt: record.domainVerifiedAt,
              },
            ],
      zitadelOrgId: record.zitadelOrgId,
      zitadelIdpId: record.zitadelIdpId,
      enabled: record.enabled,
      jitProvisioningEnabled: record.jitProvisioningEnabled,
      localPasswordLoginEnabled: record.localPasswordLoginEnabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(connection: OrgSsoConnection): OrgSsoConnectionRecord {
    const record = new OrgSsoConnectionRecord();
    record.id = connection.id;
    record.orgId = connection.orgId;
    record.emailDomain = connection.emailDomain;
    record.domainVerifiedAt = connection.domainVerifiedAt;
    record.emailDomains = connection.emailDomains.map((domain) => {
      const domainRecord = new OrgSsoEmailDomainRecord();
      domainRecord.id = randomUUID();
      domainRecord.orgSsoConnectionId = connection.id;
      domainRecord.emailDomain = domain.emailDomain;
      domainRecord.verifiedAt = domain.verifiedAt;
      domainRecord.createdAt = connection.updatedAt;
      domainRecord.updatedAt = connection.updatedAt;
      return domainRecord;
    });
    record.zitadelOrgId = connection.zitadelOrgId;
    record.zitadelIdpId = connection.zitadelIdpId;
    record.enabled = connection.enabled;
    record.jitProvisioningEnabled = connection.jitProvisioningEnabled;
    record.localPasswordLoginEnabled = connection.localPasswordLoginEnabled;
    record.createdAt = connection.createdAt;
    record.updatedAt = connection.updatedAt;
    return record;
  }
}
