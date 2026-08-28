import { validate } from 'class-validator';
import { SetOrgSsoEnabledRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-sso-enabled.request-dto';

describe(SetOrgSsoEnabledRequestDto.name, () => {
  it('requires the reviewed mapping when enabling SSO', async () => {
    const dto = Object.assign(new SetOrgSsoEnabledRequestDto(), {
      enabled: true,
      confirmed: true,
    });

    const errors = await validate(dto);

    expect(
      errors
        .map(({ property }) => property)
        .sort((left, right) => left.localeCompare(right)),
    ).toEqual(['reviewedEmailDomains', 'reviewedZitadelOrgId']);
  });

  it('does not require a reviewed mapping when disabling SSO', async () => {
    const dto = Object.assign(new SetOrgSsoEnabledRequestDto(), {
      enabled: false,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects non-string reviewed domains without throwing', async () => {
    const dto = Object.assign(new SetOrgSsoEnabledRequestDto(), {
      enabled: true,
      confirmed: true,
      reviewedEmailDomains: ['stadt.example', 42],
      reviewedZitadelOrgId: '385820595704561666',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
