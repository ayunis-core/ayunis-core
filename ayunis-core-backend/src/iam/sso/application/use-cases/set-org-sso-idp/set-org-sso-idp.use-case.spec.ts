import {
  TEST_ORG_ID,
  anOrgSsoConnection,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { InvalidSsoConfigurationError } from 'src/iam/sso/application/sso.errors';
import { SetOrgSsoIdpCommand } from 'src/iam/sso/application/use-cases/set-org-sso-idp/set-org-sso-idp.command';
import { SetOrgSsoIdpUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-idp/set-org-sso-idp.use-case';

describe(SetOrgSsoIdpUseCase.name, () => {
  it('rejects identity provider changes while SSO-only is enforced', async () => {
    const repository = createMockOrgSsoConnectionsRepository();
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({
        enabled: true,
        localPasswordLoginEnabled: false,
        zitadelIdpId: 'current-idp',
      }),
    );
    const useCase = new SetOrgSsoIdpUseCase(repository);

    await expect(
      useCase.execute(new SetOrgSsoIdpCommand(TEST_ORG_ID, 'replacement-idp')),
    ).rejects.toMatchObject({
      constructor: InvalidSsoConfigurationError,
      metadata: { field: 'localPasswordLoginEnabled' },
    });
    expect(repository.setZitadelIdpIdIfMappingMatches).not.toHaveBeenCalled();
  });
});
