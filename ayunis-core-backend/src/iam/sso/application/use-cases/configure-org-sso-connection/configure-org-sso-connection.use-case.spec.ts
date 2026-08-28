import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { SsoConnectionUniqueConstraintError } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { OrgNotFoundError } from 'src/iam/orgs/application/orgs.errors';
import {
  OTHER_ORG_ID,
  TEST_ORG_ID,
  anOrg,
  anOrgSsoConnection,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionConflictError,
  SsoConnectionMustBeDisabledError,
} from 'src/iam/sso/application/sso.errors';

describe(ConfigureOrgSsoConnectionUseCase.name, () => {
  const command = new ConfigureOrgSsoConnectionCommand(
    TEST_ORG_ID,
    ' Stadt.Example ',
    ' zitadel-org-1 ',
  );
  const commandWithIdp = new ConfigureOrgSsoConnectionCommand(
    TEST_ORG_ID,
    ' Stadt.Example ',
    ' zitadel-org-1 ',
    ' zitadel-idp-1 ',
  );
  let repository: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let findOrgById: jest.Mocked<Pick<FindOrgByIdUseCase, 'execute'>>;
  let useCase: ConfigureOrgSsoConnectionUseCase;

  beforeEach(() => {
    repository = createMockOrgSsoConnectionsRepository();
    findOrgById = { execute: jest.fn().mockResolvedValue(anOrg()) };
    useCase = new ConfigureOrgSsoConnectionUseCase(
      createPinoLoggerMock(),
      repository,
      findOrgById as unknown as FindOrgByIdUseCase,
    );
  });

  it('creates a disabled connection with normalized values and JIT off', async () => {
    const before = new Date();

    const result = await useCase.execute(command);

    expect(findOrgById.execute).toHaveBeenCalledWith(
      new FindOrgByIdQuery(TEST_ORG_ID),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: TEST_ORG_ID,
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        enabled: false,
        jitProvisioningEnabled: false,
      }),
    );
    expect(result.domainVerifiedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it('persists the direct IdP with the mapping in one write', async () => {
    await useCase.execute(commandWithIdp);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        zitadelIdpId: 'zitadel-idp-1',
      }),
    );
  });

  it('updates the direct IdP atomically on a disabled mapping', async () => {
    const existing = anOrgSsoConnection();
    repository.findByOrgId.mockResolvedValue(existing);
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);

    await useCase.execute(commandWithIdp);

    expect(repository.updateConfigurationIfDisabled).toHaveBeenCalledWith(
      expect.objectContaining({
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        zitadelIdpId: 'zitadel-idp-1',
      }),
      existing,
    );
  });

  it('propagates a missing organization error without writing', async () => {
    findOrgById.execute.mockRejectedValue(new OrgNotFoundError(TEST_ORG_ID));

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      OrgNotFoundError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reports invalid connection values as configuration errors', async () => {
    await expect(
      useCase.execute(
        new ConfigureOrgSsoConnectionCommand(
          TEST_ORG_ID,
          'not-a-domain',
          'zitadel-org-1',
        ),
      ),
    ).rejects.toBeInstanceOf(InvalidSsoConfigurationError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['email domain', 'findByEmailDomain'],
    ['Zitadel organization', 'findByZitadelOrgId'],
  ] as const)(
    'rejects a %s already mapped to another organization',
    async (_, finder) => {
      repository[finder].mockResolvedValue(
        anOrgSsoConnection({ orgId: OTHER_ORG_ID }),
      );

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        SsoConnectionConflictError,
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('returns the existing connection without writing when configuration is unchanged', async () => {
    const existing = anOrgSsoConnection({ jitProvisioningEnabled: true });
    repository.findByOrgId.mockResolvedValue(existing);
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);

    await expect(useCase.execute(command)).resolves.toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'preserves an existing IdP when an unchanged configuration omits it (enabled: %s)',
    async (enabled) => {
      const existing = anOrgSsoConnection({
        zitadelIdpId: 'zitadel-idp-1',
        enabled,
      });
      repository.findByOrgId.mockResolvedValue(existing);
      repository.findByEmailDomain.mockResolvedValue(existing);
      repository.findByZitadelOrgId.mockResolvedValue(existing);

      await expect(useCase.execute(command)).resolves.toBe(existing);
      expect(repository.updateConfigurationIfDisabled).not.toHaveBeenCalled();
    },
  );

  it('clears an existing IdP only when null is explicit', async () => {
    const existing = anOrgSsoConnection({ zitadelIdpId: 'zitadel-idp-1' });
    repository.findByOrgId.mockResolvedValue(existing);
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);

    await useCase.execute(
      new ConfigureOrgSsoConnectionCommand(
        TEST_ORG_ID,
        'stadt.example',
        'zitadel-org-1',
        null,
      ),
    );

    expect(repository.updateConfigurationIfDisabled).toHaveBeenCalledWith(
      expect.objectContaining({ zitadelIdpId: null }),
      existing,
    );
  });

  it('returns an identical connection created concurrently', async () => {
    const concurrent = anOrgSsoConnection();
    repository.findByOrgId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrent);
    repository.save.mockRejectedValue(
      new SsoConnectionUniqueConstraintError('orgId'),
    );

    await expect(useCase.execute(command)).resolves.toBe(concurrent);
  });

  it('reports a concurrent insert with different configuration as an organization conflict', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        anOrgSsoConnection({ emailDomain: 'anders.example' }),
      );
    repository.save.mockRejectedValue(
      new SsoConnectionUniqueConstraintError('emailDomain'),
    );

    await expect(useCase.execute(command)).rejects.toMatchObject({
      constructor: SsoConnectionConflictError,
      metadata: { field: 'orgId' },
    });
  });

  it('reports a concurrent insert owned by another organization as a field conflict', async () => {
    repository.save.mockRejectedValue(
      new SsoConnectionUniqueConstraintError('emailDomain'),
    );

    await expect(useCase.execute(command)).rejects.toMatchObject({
      constructor: SsoConnectionConflictError,
      metadata: { field: 'emailDomain' },
    });
  });

  it('updates a disabled connection when its mapping changes', async () => {
    const existing = anOrgSsoConnection({
      emailDomain: 'old.example',
      zitadelOrgId: 'old-zitadel-org',
      zitadelIdpId: 'old-zitadel-idp',
      jitProvisioningEnabled: true,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      id: existing.id,
      emailDomain: 'stadt.example',
      zitadelOrgId: 'zitadel-org-1',
      zitadelIdpId: null,
      enabled: false,
      jitProvisioningEnabled: true,
    });
    expect(repository.updateConfigurationIfDisabled).toHaveBeenCalledWith(
      expect.objectContaining({
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
      }),
      existing,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not change JIT when the mapping is unchanged', async () => {
    const existing = anOrgSsoConnection({ jitProvisioningEnabled: true });
    repository.findByOrgId.mockResolvedValue(existing);
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);

    await expect(useCase.execute(command)).resolves.toBe(existing);
    expect(repository.setJitProvisioningEnabled).not.toHaveBeenCalled();
  });

  it('requires an enabled connection to be disabled before changing its mapping', async () => {
    repository.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({
        emailDomain: 'old.example',
        enabled: true,
      }),
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      SsoConnectionMustBeDisabledError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a mapping update if the connection becomes enabled concurrently', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection({ emailDomain: 'old.example' }))
      .mockResolvedValueOnce(
        anOrgSsoConnection({ emailDomain: 'old.example', enabled: true }),
      );
    repository.updateConfigurationIfDisabled.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      SsoConnectionMustBeDisabledError,
    );
  });

  it('rejects a mapping update when the mapping changes concurrently', async () => {
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection({ emailDomain: 'old.example' }))
      .mockResolvedValueOnce(
        anOrgSsoConnection({ emailDomain: 'other.example' }),
      );
    repository.updateConfigurationIfDisabled.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      SsoConnectionChangedError,
    );
  });

  it('returns an identical mapping updated concurrently', async () => {
    const concurrent = anOrgSsoConnection({ enabled: true });
    repository.findByOrgId
      .mockResolvedValueOnce(anOrgSsoConnection({ emailDomain: 'old.example' }))
      .mockResolvedValueOnce(concurrent);
    repository.updateConfigurationIfDisabled.mockResolvedValue(null);

    await expect(useCase.execute(command)).resolves.toBe(concurrent);
  });

  it('reports a concurrent mapping ownership collision as a field conflict', async () => {
    const existing = anOrgSsoConnection({ emailDomain: 'old.example' });
    repository.findByOrgId.mockResolvedValue(existing);
    repository.updateConfigurationIfDisabled.mockRejectedValue(
      new SsoConnectionUniqueConstraintError('zitadelOrgId'),
    );

    await expect(useCase.execute(command)).rejects.toMatchObject({
      constructor: SsoConnectionConflictError,
      metadata: { field: 'zitadelOrgId' },
    });
  });
});
