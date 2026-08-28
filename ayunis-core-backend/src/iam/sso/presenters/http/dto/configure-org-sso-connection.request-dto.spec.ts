import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigureOrgSsoConnectionRequestDto } from 'src/iam/sso/presenters/http/dto/configure-org-sso-connection.request-dto';

function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(ConfigureOrgSsoConnectionRequestDto, input));
}

function domainWithLength(length: 253 | 254): string {
  return [63, 63, 63, length - 192]
    .map((labelLength) => 'a'.repeat(labelLength))
    .join('.');
}

describe(ConfigureOrgSsoConnectionRequestDto.name, () => {
  const validInput = {
    emailDomains: ['stadt.example', 'vhs.example'],
    zitadelOrgId: '385820595704561666',
    zitadelIdpId: '388145187060187138',
    domainVerified: true,
  };

  it('accepts a complete connection configuration', async () => {
    await expect(validateDto(validInput)).resolves.toHaveLength(0);
  });

  it('accepts the broker UI fallback without a direct IdP', async () => {
    await expect(
      validateDto({ ...validInput, zitadelIdpId: undefined }),
    ).resolves.toHaveLength(0);
  });

  it.each([['localhost'], ['-stadt.example'], ['stadt.example/path']])(
    'rejects invalid email domain %s',
    async (emailDomain) => {
      await expect(
        validateDto({ ...validInput, emailDomains: [emailDomain] }),
      ).resolves.not.toHaveLength(0);
    },
  );

  it('rejects duplicate domains regardless of case or whitespace', async () => {
    await expect(
      validateDto({
        ...validInput,
        emailDomains: ['stadt.example', ' STADT.EXAMPLE '],
      }),
    ).resolves.not.toHaveLength(0);
  });

  it('requires at least one domain', async () => {
    await expect(
      validateDto({ ...validInput, emailDomains: [] }),
    ).resolves.not.toHaveLength(0);
  });

  it('accepts exactly 50 domains', async () => {
    const emailDomains = Array.from(
      { length: 50 },
      (_, index) => `domain-${index}.example`,
    );

    await expect(
      validateDto({ ...validInput, emailDomains }),
    ).resolves.toHaveLength(0);
  });

  it('rejects more than 50 domains', async () => {
    const emailDomains = Array.from(
      { length: 51 },
      (_, index) => `domain-${index}.example`,
    );

    await expect(
      validateDto({ ...validInput, emailDomains }),
    ).resolves.not.toHaveLength(0);
  });

  it('accepts a domain at the 253-character limit', async () => {
    await expect(
      validateDto({
        ...validInput,
        emailDomains: [domainWithLength(253)],
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects a domain above the 253-character limit', async () => {
    await expect(
      validateDto({
        ...validInput,
        emailDomains: [domainWithLength(254)],
      }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejects non-string domain entries without throwing', async () => {
    await expect(
      validateDto({ ...validInput, emailDomains: ['stadt.example', 42] }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejects whitespace in a Zitadel organization ID', async () => {
    await expect(
      validateDto({ ...validInput, zitadelOrgId: 'zitadel org' }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejects whitespace in a Zitadel identity provider ID', async () => {
    await expect(
      validateDto({ ...validInput, zitadelIdpId: 'zitadel idp' }),
    ).resolves.not.toHaveLength(0);
  });

  it('requires explicit domain verification', async () => {
    await expect(
      validateDto({ ...validInput, domainVerified: false }),
    ).resolves.not.toHaveLength(0);
  });
});
