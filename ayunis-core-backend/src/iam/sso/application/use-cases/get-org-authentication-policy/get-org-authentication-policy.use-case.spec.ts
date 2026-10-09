import {
  TEST_ORG_ID,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

describe(GetOrgAuthenticationPolicyUseCase.name, () => {
  it('allows local password login when no SSO connection exists', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    const useCase = new GetOrgAuthenticationPolicyUseCase(repository);

    await expect(
      useCase.execute(new GetOrgAuthenticationPolicyQuery(TEST_ORG_ID)),
    ).resolves.toEqual({ localPasswordLoginEnabled: true });
  });

  it('returns the stored organization policy', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findLocalPasswordLoginEnabledByOrgId.mockResolvedValue(false);
    const useCase = new GetOrgAuthenticationPolicyUseCase(repository);

    await expect(
      useCase.execute(new GetOrgAuthenticationPolicyQuery(TEST_ORG_ID)),
    ).resolves.toEqual({ localPasswordLoginEnabled: false });
  });

  it('returns service unavailable when PostgreSQL cannot load the policy', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findLocalPasswordLoginEnabledByOrgId.mockRejectedValue(
      Object.assign(new Error('the database system is in recovery mode'), {
        code: '57P03',
      }),
    );
    const useCase = new GetOrgAuthenticationPolicyUseCase(repository);

    await expect(
      useCase.execute(new GetOrgAuthenticationPolicyQuery(TEST_ORG_ID)),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
