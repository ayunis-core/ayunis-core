import type { UUID } from 'crypto';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
const VERIFIED_AT = new Date('2026-08-27T12:00:00.000Z');

function connectionWithDomains(...emailDomains: string[]) {
  return new OrgSsoConnection({
    orgId: ORG_ID,
    emailDomains: emailDomains.map((emailDomain) => ({
      emailDomain,
      verifiedAt: VERIFIED_AT,
    })),
    zitadelOrgId: 'zitadel-org-1',
  });
}

describe(OrgSsoConnection.name, () => {
  it('allows local password login by default', () => {
    expect(
      connectionWithDomains('stadt.example').localPasswordLoginEnabled,
    ).toBe(true);
  });

  it('retains an explicit SSO-only policy', () => {
    const connection = new OrgSsoConnection({
      orgId: ORG_ID,
      emailDomains: [{ emailDomain: 'stadt.example', verifiedAt: VERIFIED_AT }],
      zitadelOrgId: 'zitadel-org-1',
      localPasswordLoginEnabled: false,
    });

    expect(connection.localPasswordLoginEnabled).toBe(false);
  });

  it('normalizes and sorts every verified email domain', () => {
    const connection = connectionWithDomains(
      ' VHS.Bremerhaven.DE ',
      'bit.bremerhaven.de',
    );

    expect(connection.emailDomains).toEqual([
      { emailDomain: 'bit.bremerhaven.de', verifiedAt: VERIFIED_AT },
      { emailDomain: 'vhs.bremerhaven.de', verifiedAt: VERIFIED_AT },
    ]);
  });

  it('checks membership using the normalized domain', () => {
    const connection = connectionWithDomains('vhs.bremerhaven.de');

    expect(connection.hasEmailDomain('VHS.Bremerhaven.DE')).toBe(true);
    expect(connection.hasEmailDomain('other.example')).toBe(false);
  });

  it('matches only the complete normalized domain set', () => {
    const connection = connectionWithDomains(
      'bit.bremerhaven.de',
      'vhs.bremerhaven.de',
    );

    expect(
      connection.matchesEmailDomains([
        'vhs.bremerhaven.de',
        'BIT.BREMERHAVEN.DE',
      ]),
    ).toBe(true);
    expect(connection.matchesEmailDomains(['bit.bremerhaven.de'])).toBe(false);
  });

  it('rejects duplicate normalized domains', () => {
    expect(() =>
      connectionWithDomains('stadt.example', ' STADT.EXAMPLE '),
    ).toThrow(InvalidSsoConnectionValueError);
  });

  it.each([
    { emailDomains: [] },
    {
      emailDomains: Array.from(
        { length: 51 },
        (_, index) => `d-${index}.example`,
      ),
    },
  ])(
    'rejects a domain collection outside the supported size',
    ({ emailDomains }) => {
      expect(() => connectionWithDomains(...emailDomains)).toThrow(
        InvalidSsoConnectionValueError,
      );
    },
  );
});
