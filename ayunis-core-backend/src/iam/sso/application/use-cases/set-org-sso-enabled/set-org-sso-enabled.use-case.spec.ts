import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
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
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';

describe(SetOrgSsoEnabledUseCase.name, () => {
  let repository: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let useCase: SetOrgSsoEnabledUseCase;

  beforeEach(() => {
    repository = createMockOrgSsoConnectionsRepository();
    useCase = new SetOrgSsoEnabledUseCase(createPinoLoggerMock(), repository);
  });

  it('rejects an organization without an SSO connection', async () => {
    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionNotFoundError);
  });

  it.each([true, false])('sets enabled to %s', async (enabled) => {
    const existing = anOrgSsoConnection({ enabled: !enabled });
    repository.findByOrgId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetOrgSsoEnabledCommand(TEST_ORG_ID, enabled),
    );

    expect(result.enabled).toBe(enabled);
    expect(repository.setEnabled).toHaveBeenCalledWith(existing, enabled);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects enablement without a Zitadel organization mapping', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ zitadelOrgId: null }),
    );

    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(InvalidSsoConfigurationError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'rejects enablement without canonical email domains (currently enabled: %s)',
    async (enabled) => {
      repository.findByOrgIdWithDomainState.mockResolvedValue(
        anOrgSsoConnectionDomainState(anOrgSsoConnection({ enabled }), false),
      );

      await expect(
        useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
      ).rejects.toMatchObject({
        constructor: InvalidSsoConfigurationError,
        metadata: { field: 'emailDomains' },
      });
      expect(repository.setEnabled).not.toHaveBeenCalled();
    },
  );

  it('does not write when the requested state is already set', async () => {
    const existing = anOrgSsoConnection({ enabled: true });
    repository.findByOrgId.mockResolvedValue(existing);

    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).resolves.toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('enables the exact mapping reviewed by the operator', async () => {
    const existing = anOrgSsoConnection();
    repository.findByOrgId.mockResolvedValue(existing);

    await useCase.execute(
      new SetOrgSsoEnabledCommand(TEST_ORG_ID, true, {
        emailDomains: existing.emailDomains.map(
          ({ emailDomain }) => emailDomain,
        ),
        zitadelOrgId: existing.zitadelOrgId!,
      }),
    );

    expect(repository.setEnabled).toHaveBeenCalledWith(existing, true);
  });

  it('rejects enablement when the reviewed mapping is stale', async () => {
    repository.findByOrgId.mockResolvedValue(anOrgSsoConnection());

    await expect(
      useCase.execute(
        new SetOrgSsoEnabledCommand(TEST_ORG_ID, true, {
          emailDomains: ['old.stadt.example'],
          zitadelOrgId: 'old-zitadel-org',
        }),
      ),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
    expect(repository.setEnabled).not.toHaveBeenCalled();
  });

  it('reports an invalid reviewed domain as configuration input', async () => {
    repository.findByOrgId.mockResolvedValue(anOrgSsoConnection());

    await expect(
      useCase.execute(
        new SetOrgSsoEnabledCommand(TEST_ORG_ID, true, {
          emailDomains: ['not-a-domain'],
          zitadelOrgId: 'zitadel-org-1',
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidSsoConfigurationError);
  });

  it('reports a concurrently removed connection as not found', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection())
      .mockResolvedValueOnce(null);
    repository.setEnabled.mockResolvedValue(null);

    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionNotFoundError);
  });

  it('rejects enablement when the mapping changes concurrently', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection())
      .mockResolvedValueOnce(
        anOrgSsoConnection({ emailDomain: 'changed.example' }),
      );
    repository.setEnabled.mockResolvedValue(null);

    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
  });
});
