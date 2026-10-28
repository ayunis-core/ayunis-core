import {
  TEST_ORG_ID,
  anOrgSsoConnection,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { GetOrgSsoConnectionQuery } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.query';
import { GetOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.use-case';

describe(GetOrgSsoConnectionUseCase.name, () => {
  it('returns the organization SSO connection when configured', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    const connection = anOrgSsoConnection();
    repository.findByOrgId.mockResolvedValue(connection);
    const useCase = new GetOrgSsoConnectionUseCase(repository);

    await expect(
      useCase.execute(new GetOrgSsoConnectionQuery(TEST_ORG_ID)),
    ).resolves.toBe(connection);
  });

  it('returns null when the organization has no SSO connection', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    const useCase = new GetOrgSsoConnectionUseCase(repository);

    await expect(
      useCase.execute(new GetOrgSsoConnectionQuery(TEST_ORG_ID)),
    ).resolves.toBeNull();
  });
});
