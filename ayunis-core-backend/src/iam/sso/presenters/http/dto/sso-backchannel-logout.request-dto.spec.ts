import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SsoBackchannelLogoutRequestDto } from 'src/iam/sso/presenters/http/dto/sso-backchannel-logout.request-dto';

describe(SsoBackchannelLogoutRequestDto.name, () => {
  it('accepts a logout token at the size limit', async () => {
    const dto = plainToInstance(SsoBackchannelLogoutRequestDto, {
      logout_token: 'x'.repeat(16_384),
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an oversized logout token', async () => {
    const dto = plainToInstance(SsoBackchannelLogoutRequestDto, {
      logout_token: 'x'.repeat(16_385),
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
