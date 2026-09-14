import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import type { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { UUID } from 'crypto';

describe(LocalPasswordLoginPolicyService.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const user = aUser({ orgId });
  const getPolicy = { execute: jest.fn() };
  const findUser = { execute: jest.fn() };
  const service = new LocalPasswordLoginPolicyService(
    getPolicy as unknown as GetOrgAuthenticationPolicyUseCase,
    findUser as unknown as FindUserByIdUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.execute.mockResolvedValue(user);
  });

  it('rejects password authentication when the organization requires SSO', async () => {
    getPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: false,
    });

    await expect(
      service.assertAllowedForOrg(orgId, SessionAuthenticationMethod.PASSWORD),
    ).rejects.toBeInstanceOf(LocalPasswordLoginDisabledError);
  });

  it('locks the policy while issuing a password session', async () => {
    getPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: true,
    });

    await service.assertSessionIssuanceAllowed(
      orgId,
      SessionAuthenticationMethod.PASSWORD,
    );

    expect(getPolicy.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, lockForSessionIssuance: true }),
    );
  });

  it('does not query the password policy for SSO authentication', async () => {
    await expect(
      service.assertAllowedForOrg(orgId, SessionAuthenticationMethod.SSO),
    ).resolves.toBeUndefined();
    expect(getPolicy.execute).not.toHaveBeenCalled();
  });

  it('resolves and authorizes a user for an MFA continuation', async () => {
    getPolicy.execute.mockResolvedValue({ localPasswordLoginEnabled: true });

    await expect(
      service.assertAllowedForUser(
        user.id,
        SessionAuthenticationMethod.PASSWORD,
      ),
    ).resolves.toBe(user);

    expect(getPolicy.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId }),
    );
  });
});
