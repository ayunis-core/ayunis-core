import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import { GetOrgSsoConnectionQuery } from 'src/iam/sso/application/use-cases/get-org-sso-connection/get-org-sso-connection.query';
import { SetOrgSsoEnabledCommand } from 'src/iam/sso/application/use-cases/set-org-sso-enabled/set-org-sso-enabled.command';
import { SetOrgSsoJitProvisioningCommand } from 'src/iam/sso/application/use-cases/set-org-sso-jit-provisioning/set-org-sso-jit-provisioning.command';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { SuperAdminSsoConnectionsController } from 'src/iam/sso/presenters/http/super-admin-sso-connections.controller';
import { OrgSsoConnectionResponseDtoMapper } from 'src/iam/sso/presenters/http/mappers/org-sso-connection-response-dto.mapper';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const SUPER_ADMIN_ID = '33333333-3333-3333-3333-333333333333';

function createController() {
  const logger = createPinoLoggerMock();
  const getConnection = { execute: jest.fn() };
  const configureConnection = { execute: jest.fn() };
  const setEnabled = { execute: jest.fn() };
  const setJit = { execute: jest.fn() };
  const setIdp = { execute: jest.fn() };
  return {
    controller: new SuperAdminSsoConnectionsController(
      logger,
      getConnection as never,
      configureConnection as never,
      setEnabled as never,
      setJit as never,
      setIdp as never,
      new OrgSsoConnectionResponseDtoMapper(),
    ),
    logger,
    getConnection,
    configureConnection,
    setEnabled,
    setJit,
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
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
        zitadelIdpId: 'zitadel-idp-1',
        domainVerified: true,
      },
      SUPER_ADMIN_ID,
    );

    expect(configureConnection.execute).toHaveBeenCalledWith(
      new ConfigureOrgSsoConnectionCommand(
        TEST_ORG_ID,
        'stadt.example',
        'zitadel-org-1',
        'zitadel-idp-1',
      ),
    );
    expect(result.connection).toMatchObject({ orgId: TEST_ORG_ID });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          domain: 'stadt.example',
          zitadelOrgId: 'zitadel-org-1',
        }),
        confirmation: { domainVerified: true },
      }),
      'Superadmin changed SSO connection',
    );
    expect(logger.info.mock.calls[0]?.[0]).not.toHaveProperty(
      'connection.emailDomain',
    );
    expect(logger.info.mock.calls[0]?.[0]).not.toHaveProperty(
      'confirmation.domain',
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
        reviewedEmailDomain: 'stadt.example',
        reviewedZitadelOrgId: 'zitadel-org-1',
      },
      SUPER_ADMIN_ID,
    );

    expect(setEnabled.execute).toHaveBeenCalledWith(
      new SetOrgSsoEnabledCommand(TEST_ORG_ID, true, {
        emailDomain: 'stadt.example',
        zitadelOrgId: 'zitadel-org-1',
      }),
    );
    expect(result.connection).toMatchObject({ enabled: true });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmation: {
          confirmed: true,
          domain: 'stadt.example',
          reviewedZitadelOrgId: 'zitadel-org-1',
        },
      }),
      'Superadmin changed SSO connection',
    );
    expect(logger.info.mock.calls[0]?.[0]).not.toHaveProperty(
      'confirmation.reviewedEmailDomain',
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

  it('rejects enablement without explicit confirmation', async () => {
    const { controller, setEnabled } = createController();

    await expect(
      controller.setEnabled(TEST_ORG_ID, { enabled: true }, SUPER_ADMIN_ID),
    ).rejects.toThrow('requires confirmation');
    expect(setEnabled.execute).not.toHaveBeenCalled();
  });

  it('rejects enablement without the reviewed mapping', async () => {
    const { controller, setEnabled } = createController();

    await expect(
      controller.setEnabled(
        TEST_ORG_ID,
        { enabled: true, confirmed: true },
        SUPER_ADMIN_ID,
      ),
    ).rejects.toThrow('reviewed broker mapping');
    expect(setEnabled.execute).not.toHaveBeenCalled();
  });
});
