jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import {
  TEST_ORG_ID,
  anOrgSsoConnection,
  anOrgSsoConnectionDomainState,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
} from 'src/iam/sso/application/sso.errors';
import { SetOrgLocalPasswordLoginEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-local-password-login-enabled/set-org-local-password-login-enabled.command';
import { SetOrgLocalPasswordLoginEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-local-password-login-enabled/set-org-local-password-login-enabled.use-case';
import { createMockRefreshTokensRepository } from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { RevokePasswordSessionsForOrgUseCase } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.use-case';
import { ReviewedSsoMapping } from 'src/iam/sso/application/models/reviewed-sso-mapping';

const REVIEWED_MAPPING = new ReviewedSsoMapping(
  ['stadt.example'],
  'zitadel-org-1',
  null,
);

describe(SetOrgLocalPasswordLoginEnabledUseCase.name, () => {
  let repository: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let refreshTokens: ReturnType<typeof createMockRefreshTokensRepository>;
  let useCase: SetOrgLocalPasswordLoginEnabledUseCase;

  beforeEach(() => {
    repository = createMockOrgSsoConnectionsRepository();
    refreshTokens = createMockRefreshTokensRepository();
    useCase = new SetOrgLocalPasswordLoginEnabledUseCase(
      repository,
      new RevokePasswordSessionsForOrgUseCase(refreshTokens),
    );
  });

  it('rejects an organization without an SSO connection', async () => {
    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(TEST_ORG_ID, false),
      ),
    ).rejects.toBeInstanceOf(SsoConnectionNotFoundError);
  });

  it('requires an enabled SSO connection before disabling password login', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ enabled: false }),
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(TEST_ORG_ID, false),
      ),
    ).rejects.toMatchObject({
      constructor: InvalidSsoConfigurationError,
      metadata: { field: 'enabled' },
    });
  });

  it('requires canonical domains before disabling password login', async () => {
    repository.findByOrgIdWithDomainState.mockResolvedValue(
      anOrgSsoConnectionDomainState(
        anOrgSsoConnection({ enabled: true }),
        false,
      ),
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(TEST_ORG_ID, false),
      ),
    ).rejects.toMatchObject({
      constructor: InvalidSsoConfigurationError,
      metadata: { field: 'emailDomains' },
    });
  });

  it('disables local password login without disabling SSO', async () => {
    const existing = anOrgSsoConnection({ enabled: true });
    repository.findByOrgId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetOrgLocalPasswordLoginEnabledCommand(
        TEST_ORG_ID,
        false,
        REVIEWED_MAPPING,
      ),
    );

    expect(result).toMatchObject({
      connection: {
        enabled: true,
        localPasswordLoginEnabled: false,
      },
      previousLocalPasswordLoginEnabled: true,
    });
    expect(
      repository.setLocalPasswordLoginEnabledIfMappingMatches,
    ).toHaveBeenCalledWith(existing, false);
    expect(repository.setEnabled).not.toHaveBeenCalled();
    expect(refreshTokens.revokePasswordSessionsForOrg).toHaveBeenCalledWith(
      TEST_ORG_ID,
    );
    expect(
      repository.setLocalPasswordLoginEnabledIfMappingMatches.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      refreshTokens.revokePasswordSessionsForOrg.mock.invocationCallOrder[0],
    );
  });

  it('requires confirmation of the active SSO mapping', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ enabled: true }),
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(TEST_ORG_ID, false),
      ),
    ).rejects.toMatchObject({
      constructor: InvalidSsoConfigurationError,
      metadata: { field: 'confirmation' },
    });
  });

  it('rejects confirmation for a stale SSO mapping', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ enabled: true }),
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(
          TEST_ORG_ID,
          false,
          new ReviewedSsoMapping(
            ['old.stadt.example'],
            REVIEWED_MAPPING.zitadelOrgId,
            REVIEWED_MAPPING.zitadelIdpId,
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
    expect(
      repository.setLocalPasswordLoginEnabledIfMappingMatches,
    ).not.toHaveBeenCalled();
  });

  it('rejects confirmation for a different identity provider', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ enabled: true, zitadelIdpId: 'active-idp' }),
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(
          TEST_ORG_ID,
          false,
          new ReviewedSsoMapping(
            REVIEWED_MAPPING.emailDomains,
            REVIEWED_MAPPING.zitadelOrgId,
            'reviewed-idp',
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
    expect(
      repository.setLocalPasswordLoginEnabledIfMappingMatches,
    ).not.toHaveBeenCalled();
  });

  it('allows local password login to be restored while SSO is disabled', async () => {
    const existing = anOrgSsoConnection({
      enabled: false,
      localPasswordLoginEnabled: false,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(TEST_ORG_ID, true),
      ),
    ).resolves.toMatchObject({
      connection: { localPasswordLoginEnabled: true },
      previousLocalPasswordLoginEnabled: false,
    });
    expect(refreshTokens.revokePasswordSessionsForOrg).not.toHaveBeenCalled();
  });

  it('does not write when the requested state is already set', async () => {
    const existing = anOrgSsoConnection({
      enabled: true,
      localPasswordLoginEnabled: false,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(
          TEST_ORG_ID,
          false,
          REVIEWED_MAPPING,
        ),
      ),
    ).resolves.toEqual({
      connection: existing,
      previousLocalPasswordLoginEnabled: false,
    });
    expect(
      repository.setLocalPasswordLoginEnabledIfMappingMatches,
    ).not.toHaveBeenCalled();
    expect(refreshTokens.revokePasswordSessionsForOrg).not.toHaveBeenCalled();
  });

  it('rejects a concurrent SSO mapping change', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ enabled: true }),
    );
    repository.setLocalPasswordLoginEnabledIfMappingMatches.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute(
        new SetOrgLocalPasswordLoginEnabledCommand(
          TEST_ORG_ID,
          false,
          REVIEWED_MAPPING,
        ),
      ),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
    expect(refreshTokens.revokePasswordSessionsForOrg).not.toHaveBeenCalled();
  });
});
