import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getSsoErrorKey } from '@/pages/super-admin-settings/org/api/ssoMutationError';

describe(getSsoErrorKey.name, () => {
  it('explains why SSO cannot be disabled while passwordless users exist', () => {
    const error = new AxiosError(undefined, undefined, undefined, undefined, {
      data: { code: 'SSO_PASSWORDLESS_USERS_EXIST' },
      status: 409,
    } as never);

    expect(getSsoErrorKey(error)).toBe('sso.errors.passwordlessUsersExist');
  });
});
