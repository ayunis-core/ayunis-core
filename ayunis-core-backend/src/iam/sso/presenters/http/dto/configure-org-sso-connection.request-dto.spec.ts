import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigureOrgSsoConnectionRequestDto } from 'src/iam/sso/presenters/http/dto/configure-org-sso-connection.request-dto';

function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(ConfigureOrgSsoConnectionRequestDto, input));
}

describe(ConfigureOrgSsoConnectionRequestDto.name, () => {
  const validInput = {
    emailDomain: 'stadt.example',
    zitadelOrgId: '385820595704561666',
    domainVerified: true,
  };

  it('accepts a complete connection configuration', async () => {
    await expect(validateDto(validInput)).resolves.toHaveLength(0);
  });

  it.each([['localhost'], ['-stadt.example'], ['stadt.example/path']])(
    'rejects invalid email domain %s',
    async (emailDomain) => {
      await expect(
        validateDto({ ...validInput, emailDomain }),
      ).resolves.not.toHaveLength(0);
    },
  );

  it('rejects whitespace in a Zitadel organization ID', async () => {
    await expect(
      validateDto({ ...validInput, zitadelOrgId: 'zitadel org' }),
    ).resolves.not.toHaveLength(0);
  });

  it('requires explicit domain verification', async () => {
    await expect(
      validateDto({ ...validInput, domainVerified: false }),
    ).resolves.not.toHaveLength(0);
  });
});
