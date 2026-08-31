import { InvalidSsoDiscoveryEmailError } from 'src/iam/sso/application/sso.errors';
import { DiscoverOrgSsoQuery } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.query';
import { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import { createMockOrgSsoConnectionsRepository } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { anEnabledSsoConnection } from 'src/iam/sso/application/testing/sso-login.fixtures';

describe(DiscoverOrgSsoUseCase.name, () => {
  it('returns only the non-secret routing identifier for an enabled connection', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findByEmailDomain.mockResolvedValue(anEnabledSsoConnection());
    const useCase = new DiscoverOrgSsoUseCase(repository);

    await expect(
      useCase.execute(new DiscoverOrgSsoQuery('Staff@Demo.com')),
    ).resolves.toEqual({
      available: true,
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      localPasswordLoginEnabled: true,
    });
    expect(repository.findByEmailDomain).toHaveBeenCalledWith('demo.com');
  });

  it.each([
    ['unknown', null],
    ['disabled', anEnabledSsoConnection({ enabled: false })],
  ])('does not discover an %s connection', async (_case, connection) => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findByEmailDomain.mockResolvedValue(connection);
    const useCase = new DiscoverOrgSsoUseCase(repository);

    await expect(
      useCase.execute(new DiscoverOrgSsoQuery('staff@unknown.example')),
    ).resolves.toEqual({ available: false });
  });

  it.each(['not-an-email', 'staff@invalid_domain', 'staff@dept@demo.com'])(
    'rejects malformed email routing input %s',
    async (email) => {
      const useCase = new DiscoverOrgSsoUseCase(
        createMockOrgSsoConnectionsRepository(),
      );

      await expect(
        useCase.execute(new DiscoverOrgSsoQuery(email)),
      ).rejects.toBeInstanceOf(InvalidSsoDiscoveryEmailError);
    },
  );
});
