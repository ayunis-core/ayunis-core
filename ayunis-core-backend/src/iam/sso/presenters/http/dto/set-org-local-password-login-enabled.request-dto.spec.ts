import { validate } from 'class-validator';
import { SetOrgLocalPasswordLoginEnabledRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-local-password-login-enabled.request-dto';

describe(SetOrgLocalPasswordLoginEnabledRequestDto.name, () => {
  it('does not require a reviewed mapping when allowing password login', async () => {
    const dto = Object.assign(new SetOrgLocalPasswordLoginEnabledRequestDto(), {
      enabled: true,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([undefined, false])(
    'requires confirmation to be true when requiring SSO',
    async (confirmed) => {
      const dto = Object.assign(
        new SetOrgLocalPasswordLoginEnabledRequestDto(),
        {
          enabled: false,
          confirmed,
          reviewedEmailDomains: ['stadt.example'],
          reviewedZitadelOrgId: '385820595704561666',
          reviewedZitadelIdpId: null,
        },
      );

      const errors = await validate(dto);

      expect(errors.map(({ property }) => property)).toEqual(['confirmed']);
    },
  );
});
