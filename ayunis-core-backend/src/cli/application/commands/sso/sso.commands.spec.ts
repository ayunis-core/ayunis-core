import type { UUID } from 'crypto';
import { ConfigureOrgSsoConnectionCommand as ConfigureSsoApplicationCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import type { ConfigureOrgSsoConnectionUseCase } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.use-case';
import { SetOrgSsoEnabledCommand as SetSsoEnabledApplicationCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import type { SetOrgSsoEnabledUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.use-case';
import { SetOrgSsoJitProvisioningCommand as SetJitApplicationCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import type { SetOrgSsoJitProvisioningUseCase } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.use-case';
import { anOrgSsoConnection } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { ConfigureOrgSsoConnectionCliCommand } from 'src/cli/application/commands/sso/configure-org-sso-connection.command';
import { EnableOrgSsoCliCommand } from 'src/cli/application/commands/sso/enable-org-sso.command';
import { DisableOrgSsoCliCommand } from 'src/cli/application/commands/sso/disable-org-sso.command';
import { SetOrgSsoJitProvisioningCliCommand } from 'src/cli/application/commands/sso/set-org-sso-jit-provisioning.command';

const ORG_ID = '11111111-1111-4111-8111-111111111111' as UUID;

describe('SSO CLI commands', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates connection configuration to the application use case', async () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation();
    const useCase = {
      execute: jest.fn().mockResolvedValue(anOrgSsoConnection()),
    };
    const command = new ConfigureOrgSsoConnectionCliCommand(
      useCase as unknown as ConfigureOrgSsoConnectionUseCase,
    );

    await command.run([], {
      orgId: ORG_ID,
      emailDomain: 'stadt.example',
      zitadelOrgId: 'zitadel-org-1',
      jitProvisioningEnabled: true,
    });

    expect(useCase.execute).toHaveBeenCalledWith(
      new ConfigureSsoApplicationCommand(
        ORG_ID,
        'stadt.example',
        'zitadel-org-1',
        true,
      ),
    );
    expect(JSON.parse(write.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        action: 'configured',
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        domainVerifiedAt: '2026-08-11T10:00:00.000Z',
      }),
    );
  });

  it.each([
    [EnableOrgSsoCliCommand, true],
    [DisableOrgSsoCliCommand, false],
  ] as const)('delegates %s with state %s', async (CommandType, enabled) => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation();
    const useCase = {
      execute: jest.fn().mockResolvedValue(anOrgSsoConnection({ enabled })),
    };
    const command = new CommandType(
      useCase as unknown as SetOrgSsoEnabledUseCase,
    );

    await command.run([], { orgId: ORG_ID });

    expect(useCase.execute).toHaveBeenCalledWith(
      new SetSsoEnabledApplicationCommand(ORG_ID, enabled),
    );
    expect(JSON.parse(write.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        action: enabled ? 'enabled' : 'disabled',
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        domainVerifiedAt: '2026-08-11T10:00:00.000Z',
      }),
    );
  });

  it('delegates JIT configuration independently', async () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation();
    const useCase = {
      execute: jest
        .fn()
        .mockResolvedValue(
          anOrgSsoConnection({ jitProvisioningEnabled: true }),
        ),
    };
    const command = new SetOrgSsoJitProvisioningCliCommand(
      useCase as unknown as SetOrgSsoJitProvisioningUseCase,
    );

    await command.run([], { orgId: ORG_ID, enabled: true });

    expect(useCase.execute).toHaveBeenCalledWith(
      new SetJitApplicationCommand(ORG_ID, true),
    );
    expect(JSON.parse(write.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        action: 'jit_updated',
        jitProvisioningEnabled: true,
      }),
    );
  });
});
