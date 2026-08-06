import { getMetadataArgsStorage } from 'typeorm';
import { FederatedIdentityRecord } from './schema/federated-identity.record';
import { OrgSsoConnectionRecord } from './schema/org-sso-connection.record';

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
  it('stores one unique verified domain per organization', () => {
    expect(uniqueColumnsFor(OrgSsoConnectionRecord)).toEqual(
      expect.arrayContaining([['emailDomain'], ['zitadelOrgId']]),
    );
    expect(relationFor(OrgSsoConnectionRecord, 'org')).toMatchObject({
      relationType: 'one-to-one',
      options: { onDelete: 'CASCADE' },
    });
  });

  it('defaults new connections to disabled with JIT provisioning off', () => {
    expect(columnFor(OrgSsoConnectionRecord, 'enabled')?.options).toMatchObject(
      {
        default: false,
      },
    );
    expect(
      columnFor(OrgSsoConnectionRecord, 'jitProvisioningEnabled')?.options,
    ).toMatchObject({
      default: false,
    });
  });

  it('does not persist lifecycle or mutually exclusive provisioning modes', () => {
    expect(columnFor(OrgSsoConnectionRecord, 'status')).toBeUndefined();
    expect(
      columnFor(OrgSsoConnectionRecord, 'provisioningMode'),
    ).toBeUndefined();
  });

  it('keeps domain verification and Zitadel provisioning explicit', () => {
    expect(
      columnFor(OrgSsoConnectionRecord, 'verifiedEmailDomain'),
    ).toBeUndefined();
    expect(columnFor(OrgSsoConnectionRecord, 'brokerOrgId')).toBeUndefined();
    expect(
      columnFor(OrgSsoConnectionRecord, 'domainVerifiedAt')?.options,
    ).toMatchObject({ nullable: false, type: 'timestamptz' });
    expect(
      columnFor(OrgSsoConnectionRecord, 'zitadelOrgId')?.options,
    ).toMatchObject({ nullable: true });
    expect(checksFor(OrgSsoConnectionRecord)).toEqual(
      expect.arrayContaining([
        '"emailDomain" = lower(btrim("emailDomain"))',
        expect.stringContaining('"emailDomain" ~'),
        '"zitadelOrgId" IS NULL OR ("zitadelOrgId" <> \'\' AND "zitadelOrgId" = btrim("zitadelOrgId"))',
        'NOT "enabled" OR "zitadelOrgId" IS NOT NULL',
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
