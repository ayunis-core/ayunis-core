import { Injectable } from '@nestjs/common';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';

@Injectable()
export class OrgSsoConnectionMapper {
  toDomain(record: OrgSsoConnectionRecord): OrgSsoConnection {
    return new OrgSsoConnection({
      id: record.id,
      orgId: record.orgId,
      emailDomain: record.emailDomain,
      domainVerifiedAt: record.domainVerifiedAt,
      zitadelOrgId: record.zitadelOrgId,
      enabled: record.enabled,
      jitProvisioningEnabled: record.jitProvisioningEnabled,
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
    record.zitadelOrgId = connection.zitadelOrgId;
    record.enabled = connection.enabled;
    record.jitProvisioningEnabled = connection.jitProvisioningEnabled;
    record.createdAt = connection.createdAt;
    record.updatedAt = connection.updatedAt;
    return record;
  }
}
