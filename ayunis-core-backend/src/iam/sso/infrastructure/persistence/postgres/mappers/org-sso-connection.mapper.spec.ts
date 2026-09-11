import { anOrgSsoConnection } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { OrgSsoConnectionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/org-sso-connection.mapper';

describe(OrgSsoConnectionMapper.name, () => {
  const mapper = new OrgSsoConnectionMapper();

  it('round-trips the local password login policy', () => {
    const connection = anOrgSsoConnection({
      localPasswordLoginEnabled: false,
    });

    const mapped = mapper.toDomain(mapper.toRecord(connection));

    expect(mapped.localPasswordLoginEnabled).toBe(false);
  });

  it('writes every verified domain while retaining the legacy primary domain', () => {
    const verifiedAt = new Date('2026-08-27T12:00:00.000Z');
    const connection = anOrgSsoConnection({
      emailDomains: [
        { emailDomain: 'bit.bremerhaven.de', verifiedAt },
        { emailDomain: 'vhs.bremerhaven.de', verifiedAt },
      ],
    });

    const record = mapper.toRecord(connection);

    expect(record.emailDomain).toBe('bit.bremerhaven.de');
    expect(record.emailDomains).toEqual([
      expect.objectContaining({
        orgSsoConnectionId: connection.id,
        emailDomain: 'bit.bremerhaven.de',
        verifiedAt,
      }),
      expect.objectContaining({
        orgSsoConnectionId: connection.id,
        emailDomain: 'vhs.bremerhaven.de',
        verifiedAt,
      }),
    ]);
  });

  it('reads the legacy domain when an existing row has not been expanded yet', () => {
    const record = mapper.toRecord(anOrgSsoConnection());
    record.emailDomains = [];

    const connection = mapper.toDomain(record);

    expect(connection.emailDomains).toEqual([
      {
        emailDomain: record.emailDomain,
        verifiedAt: record.domainVerifiedAt,
      },
    ]);
  });
});
