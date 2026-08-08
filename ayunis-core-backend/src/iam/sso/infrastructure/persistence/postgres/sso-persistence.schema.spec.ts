import { getMetadataArgsStorage } from 'typeorm';
import { FederatedIdentityRecord } from './schema/federated-identity.record';
import { OrgSsoConnectionRecord } from './schema/org-sso-connection.record';
import { SsoConnectionStatus } from 'src/iam/sso/domain/value-objects/sso-connection-status.enum';
import { SsoProvisioningMode } from 'src/iam/sso/domain/value-objects/sso-provisioning-mode.enum';

type SsoRecord = typeof OrgSsoConnectionRecord | typeof FederatedIdentityRecord;

function uniqueColumnsFor(target: SsoRecord): string[][] {
  return getMetadataArgsStorage()
    .uniques.filter((unique) => unique.target === target)
    .map((unique) => (Array.isArray(unique.columns) ? unique.columns : []));
}

function relationFor(target: SsoRecord, propertyName: string) {
  return getMetadataArgsStorage().relations.find(
    (relation) =>
      relation.target === target && relation.propertyName === propertyName,
  );
}

function columnFor(target: SsoRecord, propertyName: string) {
  return getMetadataArgsStorage().columns.find(
    (column) =>
      column.target === target && column.propertyName === propertyName,
  );
}

function checksFor(target: SsoRecord): string[] {
  return getMetadataArgsStorage()
    .checks.filter((check) => check.target === target)
    .map((check) => check.expression);
}

describe('SSO persistence schema', () => {
  it('reserves a domain only after verification', () => {
    expect(uniqueColumnsFor(OrgSsoConnectionRecord)).toEqual(
      expect.arrayContaining([['verifiedEmailDomain'], ['brokerOrgId']]),
    );
    expect(uniqueColumnsFor(OrgSsoConnectionRecord)).not.toContainEqual([
      'emailDomain',
    ]);
    expect(relationFor(OrgSsoConnectionRecord, 'org')).toMatchObject({
      relationType: 'one-to-one',
      options: { onDelete: 'CASCADE' },
    });
  });

  it('defaults new connections to a disabled invite-only draft', () => {
    expect(columnFor(OrgSsoConnectionRecord, 'status')?.options).toMatchObject({
      default: SsoConnectionStatus.DRAFT,
    });
    expect(columnFor(OrgSsoConnectionRecord, 'enabled')?.options).toMatchObject(
      {
        default: false,
      },
    );
    expect(
      columnFor(OrgSsoConnectionRecord, 'provisioningMode')?.options,
    ).toMatchObject({ default: SsoProvisioningMode.INVITE_ONLY });
  });

  it('keeps domain verification and broker provisioning explicit', () => {
    expect(
      columnFor(OrgSsoConnectionRecord, 'verifiedEmailDomain')?.options,
    ).toMatchObject({ nullable: true });
    expect(
      columnFor(OrgSsoConnectionRecord, 'domainVerifiedAt')?.options,
    ).toMatchObject({ nullable: true, type: 'timestamptz' });
    expect(
      columnFor(OrgSsoConnectionRecord, 'brokerOrgId')?.options,
    ).toMatchObject({ nullable: true });
    expect(checksFor(OrgSsoConnectionRecord)).toEqual(
      expect.arrayContaining([
        '"emailDomain" = lower(btrim("emailDomain"))',
        expect.stringContaining('"emailDomain" ~'),
        '("verifiedEmailDomain" IS NULL) = ("domainVerifiedAt" IS NULL)',
        '"brokerOrgId" IS NULL OR ("brokerOrgId" <> \'\' AND "brokerOrgId" = btrim("brokerOrgId"))',
        '"status" <> \'active\' OR ("verifiedEmailDomain" IS NOT NULL AND "verifiedEmailDomain" = "emailDomain")',
        'NOT "enabled" OR ("status" = \'active\' AND "brokerOrgId" IS NOT NULL)',
      ]),
    );
  });

  it('keys federated identities by issuer and subject and deletes them with the user', () => {
    expect(uniqueColumnsFor(FederatedIdentityRecord)).toContainEqual([
      'issuer',
      'subject',
    ]);
    expect(relationFor(FederatedIdentityRecord, 'user')?.options).toMatchObject(
      {
        onDelete: 'CASCADE',
      },
    );
  });
});
