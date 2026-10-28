import { getMetadataArgsStorage } from 'typeorm';
import { FederatedIdentityRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/federated-identity.record';
import { OrgSsoConnectionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-connection.record';
import { OrgSsoEmailDomainRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/org-sso-email-domain.record';
import { SsoLoginTransactionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-login-transaction.record';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';
import { SsoBrokerSessionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-broker-session.record';

type SsoRecord =
  | typeof OrgSsoConnectionRecord
  | typeof OrgSsoEmailDomainRecord
  | typeof FederatedIdentityRecord
  | typeof SsoLoginTransactionRecord
  | typeof SsoBrokerSessionRecord;

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
  it('stores globally unique verified domains under one SSO connection', () => {
    expect(uniqueColumnsFor(OrgSsoEmailDomainRecord)).toContainEqual([
      'emailDomain',
    ]);
    expect(
      relationFor(OrgSsoEmailDomainRecord, 'connection')?.options,
    ).toMatchObject({ nullable: false, onDelete: 'CASCADE' });
    expect(
      columnFor(OrgSsoEmailDomainRecord, 'verifiedAt')?.options,
    ).toMatchObject({ nullable: false, type: 'timestamptz' });
    expect(checksFor(OrgSsoEmailDomainRecord)).toEqual(
      expect.arrayContaining([
        '"emailDomain" = lower(btrim("emailDomain"))',
        expect.stringContaining('"emailDomain" ~'),
      ]),
    );
  });

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

  it('binds account-link transactions to a Core user', () => {
    expect(
      columnFor(SsoLoginTransactionRecord, 'purpose')?.options,
    ).toMatchObject({
      enum: SsoLoginPurpose,
      default: SsoLoginPurpose.LOGIN,
    });
    expect(
      columnFor(SsoLoginTransactionRecord, 'linkUserId')?.options,
    ).toMatchObject({ nullable: true });
    expect(
      relationFor(SsoLoginTransactionRecord, 'linkUser')?.options,
    ).toMatchObject({ nullable: true, onDelete: 'CASCADE' });
    expect(checksFor(SsoLoginTransactionRecord)).toContain(
      `(purpose = 'login' AND link_user_id IS NULL) OR (purpose = 'link' AND link_user_id IS NOT NULL)`,
    );
  });

  it('stores encrypted logout hints under the Zitadel session ID', () => {
    expect(
      columnFor(SsoBrokerSessionRecord, 'zitadelSessionId')?.options,
    ).toMatchObject({ primary: true, type: 'varchar', length: 255 });
    expect(
      columnFor(SsoBrokerSessionRecord, 'encryptedIdToken')?.options,
    ).toMatchObject({ type: 'text' });
    expect(
      columnFor(SsoBrokerSessionRecord, 'expiresAt')?.options,
    ).toMatchObject({ type: 'timestamptz' });
    expect(relationFor(SsoBrokerSessionRecord, 'user')?.options).toMatchObject({
      nullable: false,
      onDelete: 'CASCADE',
    });
  });
});
