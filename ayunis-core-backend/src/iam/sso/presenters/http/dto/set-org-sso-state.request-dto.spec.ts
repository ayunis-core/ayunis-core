import { validate } from 'class-validator';
import { SetOrgSsoStateRequestDto } from 'src/iam/sso/presenters/http/dto/set-org-sso-state.request-dto';

describe(SetOrgSsoStateRequestDto.name, () => {
  it('accepts enabling an independent boolean setting', async () => {
    const dto = Object.assign(new SetOrgSsoStateRequestDto(), {
      enabled: true,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
