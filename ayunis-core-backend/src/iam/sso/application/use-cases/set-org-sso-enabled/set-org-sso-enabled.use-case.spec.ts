import {
  TEST_ORG_ID,
  anOrgSsoConnection,
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
    useCase = new SetOrgSsoEnabledUseCase(repository);
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

  it('does not write when the requested state is already set', async () => {
    const existing = anOrgSsoConnection({ enabled: true });
    repository.findByOrgId.mockResolvedValue(existing);

    await expect(
      useCase.execute(new SetOrgSsoEnabledCommand(TEST_ORG_ID, true)),
    ).resolves.toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
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
