import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  SsoConnectionChangedError,
  SsoConnectionNotFoundError,
} from 'src/iam/sso/application/sso.errors';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';

describe(SetOrgSsoJitProvisioningUseCase.name, () => {
  let repository: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let useCase: SetOrgSsoJitProvisioningUseCase;

  beforeEach(() => {
    repository = createMockOrgSsoConnectionsRepository();
    useCase = new SetOrgSsoJitProvisioningUseCase(
      createPinoLoggerMock(),
      repository,
    );
  });

  it('rejects an organization without an SSO connection', async () => {
    await expect(
      useCase.execute(new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionNotFoundError);
  });

  it('enables JIT independently while the SSO connection is disabled', async () => {
    const existing = anOrgSsoConnection({
      enabled: false,
      jitProvisioningEnabled: false,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true),
    );

    expect(result).toMatchObject({
      enabled: false,
      jitProvisioningEnabled: true,
    });
    expect(
      repository.setJitProvisioningEnabledIfMappingMatches,
    ).toHaveBeenCalledWith(existing, true);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a concurrent mapping change instead of flipping JIT', async () => {
    repository.findByOrgId.mockResolvedValue(anOrgSsoConnection());
    repository.setJitProvisioningEnabledIfMappingMatches.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute(new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionChangedError);
  });

  it('does not write when the requested state is already set', async () => {
    const existing = anOrgSsoConnection({ jitProvisioningEnabled: true });
    repository.findByOrgId.mockResolvedValue(existing);

    await expect(
      useCase.execute(new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true)),
    ).resolves.toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reports a concurrently removed connection as not found', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection())
      .mockResolvedValueOnce(null);
    repository.setJitProvisioningEnabledIfMappingMatches.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute(new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true)),
    ).rejects.toBeInstanceOf(SsoConnectionNotFoundError);
  });
});
