import { createLoggerMock } from 'src/common/testing/logger.mock';
import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import { GetOrgSsoConnectionQuery } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.query';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import { ReviewedSsoMapping } from 'src/iam/sso/application/models/reviewed-sso-mapping';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import { SetOrgLocalPasswordLoginEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-local-password-login-enabled/set-org-local-password-login-enabled.command';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { SuperAdminSsoConnectionsController } from 'src/iam/sso/presenters/http/super-admin-sso-connections.controller';
import { OrgSsoConnectionResponseDtoMapper } from 'src/iam/sso/presenters/http/mappers/org-sso-connection-response-dto.mapper';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const SUPER_ADMIN_ID = '33333333-3333-3333-3333-333333333333';

function createController() {
  const logger = createLoggerMock();
  const getConnection = { execute: jest.fn() };
  const configureConnection = { execute: jest.fn() };
  const setEnabled = { execute: jest.fn() };
  const setJit = { execute: jest.fn() };
  const setLocalPasswordLoginEnabled = { execute: jest.fn() };
  const setIdp = { execute: jest.fn() };
  return {
    controller: new SuperAdminSsoConnectionsController(
      getConnection as never,
      configureConnection as never,
      setEnabled as never,
      setJit as never,
      setLocalPasswordLoginEnabled as never,
      setIdp as never,
      new OrgSsoConnectionResponseDtoMapper(),
    ),
    logger,
    getConnection,
    configureConnection,
    setEnabled,
    setJit,
    setLocalPasswordLoginEnabled,
    setIdp,
  };
}

describe(SuperAdminSsoConnectionsController.name, () => {
  it('is restricted to super admins', () => {
    expect(
      Reflect.getMetadata(SYSTEM_ROLES_KEY, SuperAdminSsoConnectionsController),
    ).toEqual([SystemRole.SUPER_ADMIN]);
  });

  it('returns an empty resource when no connection is configured', async () => {
    const { controller, getConnection } = createController();
    getConnection.execute.mockResolvedValue(null);

    await expect(controller.get(TEST_ORG_ID)).resolves.toEqual({
      connection: null,
    });
    expect(getConnection.execute).toHaveBeenCalledWith(
      new GetOrgSsoConnectionQuery(TEST_ORG_ID),
    );
  });

  it('configures a verified connection through the application use case', async () => {
    const { controller, configureConnection, logger } = createController();
    const connection = anOrgSsoConnection({ jitProvisioningEnabled: true });
    configureConnection.execute.mockResolvedValue(connection);

    const result = await controller.configure(
      TEST_ORG_ID,
      {
        emailDomains: ['stadt.example', 'vhs.example'],
        zitadelOrgId: 'zitadel-org-1',
        zitadelIdpId: 'zitadel-idp-1',
        domainVerified: true,
      },
      SUPER_ADMIN_ID,
    );

    expect(configureConnection.execute).toHaveBeenCalledWith(
      new ConfigureOrgSsoConnectionCommand(
        TEST_ORG_ID,
        ['stadt.example', 'vhs.example'],
        'zitadel-org-1',
        'zitadel-idp-1',
      ),
    );
    expect(result.connection).toMatchObject({ orgId: TEST_ORG_ID });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          emailDomains: connection.emailDomains,
          zitadelOrgId: 'zitadel-org-1',
        }),
        confirmation: { domainVerified: true },
      }),
      'Superadmin changed SSO connection',
    );
  });

  it('updates runtime enablement independently', async () => {
    const { controller, setEnabled, logger } = createController();
    setEnabled.execute.mockResolvedValue(anOrgSsoConnection({ enabled: true }));

    const result = await controller.setEnabled(
      TEST_ORG_ID,
      {
        enabled: true,
        confirmed: true,
        reviewedEmailDomains: ['stadt.example', 'vhs.example'],
        reviewedZitadelOrgId: 'zitadel-org-1',
      },
      SUPER_ADMIN_ID,
    );

    expect(setEnabled.execute).toHaveBeenCalledWith(
      new SetOrgSsoEnabledCommand(
        TEST_ORG_ID,
        true,
        new ReviewedSsoMapping(
          ['stadt.example', 'vhs.example'],
          'zitadel-org-1',
        ),
      ),
    );
    expect(result.connection).toMatchObject({ enabled: true });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmation: {
          confirmed: true,
          emailDomains: ['stadt.example', 'vhs.example'],
          reviewedZitadelOrgId: 'zitadel-org-1',
        },
      }),
      'Superadmin changed SSO connection',
    );
  });

  it('updates JIT provisioning independently', async () => {
    const { controller, setJit } = createController();
    setJit.execute.mockResolvedValue(
      anOrgSsoConnection({ jitProvisioningEnabled: true }),
    );

    const result = await controller.setJitProvisioning(
      TEST_ORG_ID,
      { enabled: true },
      SUPER_ADMIN_ID,
    );

    expect(setJit.execute).toHaveBeenCalledWith(
      new SetOrgSsoJitProvisioningCommand(TEST_ORG_ID, true),
    );
    expect(result.connection).toMatchObject({ jitProvisioningEnabled: true });
  });

  it('updates local password login independently', async () => {
    const { controller, setLocalPasswordLoginEnabled, logger } =
      createController();
    setLocalPasswordLoginEnabled.execute.mockResolvedValue({
      connection: anOrgSsoConnection({
        enabled: true,
        localPasswordLoginEnabled: false,
      }),
      previousLocalPasswordLoginEnabled: true,
    });

    const result = await controller.setLocalPasswordLoginEnabled(
      TEST_ORG_ID,
      {
        enabled: false,
        confirmed: true,
        reviewedEmailDomains: ['stadt.example'],
        reviewedZitadelOrgId: 'zitadel-org-1',
        reviewedZitadelIdpId: null,
      },
      SUPER_ADMIN_ID,
    );

    expect(setLocalPasswordLoginEnabled.execute).toHaveBeenCalledWith(
      new SetOrgLocalPasswordLoginEnabledCommand(
        TEST_ORG_ID,
        false,
        new ReviewedSsoMapping(['stadt.example'], 'zitadel-org-1', null),
      ),
    );
    expect(result.connection).toMatchObject({
      enabled: true,
      localPasswordLoginEnabled: false,
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'set-local-password-login',
        confirmation: {
          localPasswordLoginEnabledBefore: true,
          localPasswordLoginEnabledAfter: false,
          confirmed: true,
          reviewedEmailDomains: ['stadt.example'],
          reviewedZitadelOrgId: 'zitadel-org-1',
          reviewedZitadelIdpId: null,
        },
      }),
      'Superadmin changed SSO connection',
    );
  });
});
