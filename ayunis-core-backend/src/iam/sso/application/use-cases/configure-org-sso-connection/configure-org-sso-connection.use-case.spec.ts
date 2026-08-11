import type { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
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
    true,
  );
  let repository: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let findOrgById: jest.Mocked<Pick<FindOrgByIdUseCase, 'execute'>>;
  let useCase: ConfigureOrgSsoConnectionUseCase;

  beforeEach(() => {
    repository = createMockOrgSsoConnectionsRepository();
    findOrgById = { execute: jest.fn().mockResolvedValue(anOrg()) };
    useCase = new ConfigureOrgSsoConnectionUseCase(
      repository,
      findOrgById as unknown as FindOrgByIdUseCase,
    );
  });

  it('creates a disabled connection with normalized values and the requested JIT setting', async () => {
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
        jitProvisioningEnabled: true,
      }),
    );
    expect(result.domainVerifiedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
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
          false,
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

  it('updates a disabled connection when its mapping changes', async () => {
    const existing = anOrgSsoConnection({
      emailDomain: 'old.example',
      zitadelOrgId: 'old-zitadel-org',
      jitProvisioningEnabled: false,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      id: existing.id,
      emailDomain: 'stadt.example',
      zitadelOrgId: 'zitadel-org-1',
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

  it('updates only JIT when an enabled mapping is unchanged', async () => {
    const existing = anOrgSsoConnection({
      enabled: true,
      jitProvisioningEnabled: false,
    });
    repository.findByOrgId.mockResolvedValue(existing);
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);

    await useCase.execute(command);

    expect(
      repository.setJitProvisioningEnabledIfMappingMatches,
    ).toHaveBeenCalledWith(existing, true);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a JIT update when the mapping changes concurrently', async () => {
    const existing = anOrgSsoConnection({ jitProvisioningEnabled: false });
    repository.findByOrgId
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(
        anOrgSsoConnection({ emailDomain: 'other.example' }),
      );
    repository.findByEmailDomain.mockResolvedValue(existing);
    repository.findByZitadelOrgId.mockResolvedValue(existing);
    repository.setJitProvisioningEnabledIfMappingMatches.mockResolvedValue(
      null,
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      SsoConnectionChangedError,
    );
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
});
