import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import {
  OrgSsoConnectionsRepository,
  SsoConnectionUniqueConstraintError,
} from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionConflictError,
  SsoConnectionMustBeDisabledError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import {
  normalizeEmailDomain,
  normalizeZitadelIdpId,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';

type SsoRoutingState = Pick<
  OrgSsoConnection,
  'emailDomain' | 'zitadelOrgId' | 'zitadelIdpId'
>;
type SsoRoutingConfiguration = SsoRoutingState & { zitadelOrgId: string };
type SsoRoutingConfigurationInput = Omit<
  SsoRoutingConfiguration,
  'zitadelIdpId'
> & { zitadelIdpId: string | null | undefined };

@Injectable()
export class ConfigureOrgSsoConnectionUseCase {
  constructor(
    @InjectPinoLogger(ConfigureOrgSsoConnectionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: OrgSsoConnectionsRepository,
    private readonly findOrgById: FindOrgByIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: ConfigureOrgSsoConnectionCommand,
  ): Promise<OrgSsoConnection> {
    const input = this.normalizeConfiguration(command);
    const { emailDomain, zitadelOrgId } = input;
    this.logger.info(
      {
        orgId: command.orgId,
        domain: emailDomain,
      },
      'Configuring organization SSO connection',
    );

    await this.findOrgById.execute(new FindOrgByIdQuery(command.orgId));
    const [existing, domainOwner, zitadelOrgOwner] = await Promise.all([
      this.repository.findByOrgId(command.orgId),
      this.repository.findByEmailDomain(emailDomain),
      this.repository.findByZitadelOrgId(zitadelOrgId),
    ]);
    this.assertMappingAvailable(command, domainOwner, zitadelOrgOwner);
    const configuration = this.resolveConfiguration(existing, input);

    if (existing && this.matches(existing, configuration)) {
      return existing;
    }
    if (existing?.enabled) {
      throw new SsoConnectionMustBeDisabledError(command.orgId);
    }

    if (!existing) {
      return this.createConnection(
        this.updatedConnection(null, command, configuration),
      );
    }

    const updated = await this.updateConnection(
      this.updatedConnection(existing, command, configuration),
      existing,
    );
    if (!updated) {
      return this.handleConcurrentConfigurationChange(
        command.orgId,
        configuration,
      );
    }
    return updated;
  }

  private async createConnection(
    connection: OrgSsoConnection,
  ): Promise<OrgSsoConnection> {
    try {
      return await this.repository.save(connection);
    } catch (error: unknown) {
      if (!(error instanceof SsoConnectionUniqueConstraintError)) throw error;
      const current = await this.repository.findByOrgId(connection.orgId);
      if (current && this.matches(current, connection)) {
        return current;
      }
      throw new SsoConnectionConflictError(current ? 'orgId' : error.field);
    }
  }

  private async updateConnection(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null> {
    try {
      return await this.repository.updateConfigurationIfDisabled(
        connection,
        expected,
      );
    } catch (error: unknown) {
      if (error instanceof SsoConnectionUniqueConstraintError) {
        throw new SsoConnectionConflictError(error.field);
      }
      throw error;
    }
  }

  private async handleConcurrentConfigurationChange(
    orgId: ConfigureOrgSsoConnectionCommand['orgId'],
    configuration: SsoRoutingConfiguration,
  ): Promise<OrgSsoConnection> {
    const current = await this.repository.findByOrgId(orgId);
    if (!current) {
      throw new SsoConnectionNotFoundError(orgId);
    }
    if (this.matches(current, configuration)) {
      return current;
    }
    if (current.enabled) {
      throw new SsoConnectionMustBeDisabledError(orgId);
    }
    throw new SsoConnectionChangedError(orgId);
  }

  private normalizeConfiguration(
    command: ConfigureOrgSsoConnectionCommand,
  ): SsoRoutingConfigurationInput {
    try {
      return {
        emailDomain: normalizeEmailDomain(command.emailDomain),
        zitadelOrgId: normalizeZitadelOrgId(command.zitadelOrgId),
        zitadelIdpId:
          command.zitadelIdpId === null || command.zitadelIdpId === undefined
            ? command.zitadelIdpId
            : normalizeZitadelIdpId(command.zitadelIdpId),
      };
    } catch (error: unknown) {
      if (error instanceof InvalidSsoConnectionValueError) {
        throw new InvalidSsoConfigurationError(error.field);
      }
      throw error;
    }
  }

  private resolveConfiguration(
    existing: OrgSsoConnection | null,
    input: SsoRoutingConfigurationInput,
  ): SsoRoutingConfiguration {
    const mappingUnchanged =
      existing !== null &&
      existing.emailDomain === input.emailDomain &&
      existing.zitadelOrgId === input.zitadelOrgId;
    if (input.zitadelIdpId !== undefined) {
      return { ...input, zitadelIdpId: input.zitadelIdpId };
    }
    return {
      ...input,
      zitadelIdpId: mappingUnchanged ? existing.zitadelIdpId : null,
    };
  }

  private assertMappingAvailable(
    command: ConfigureOrgSsoConnectionCommand,
    domainOwner: OrgSsoConnection | null,
    zitadelOrgOwner: OrgSsoConnection | null,
  ): void {
    if (domainOwner && domainOwner.orgId !== command.orgId) {
      throw new SsoConnectionConflictError('emailDomain');
    }
    if (zitadelOrgOwner && zitadelOrgOwner.orgId !== command.orgId) {
      throw new SsoConnectionConflictError('zitadelOrgId');
    }
  }

  private matches(
    existing: OrgSsoConnection,
    configuration: SsoRoutingState,
  ): boolean {
    return (
      existing.emailDomain === configuration.emailDomain &&
      existing.zitadelOrgId === configuration.zitadelOrgId &&
      existing.zitadelIdpId === configuration.zitadelIdpId
    );
  }

  private updatedConnection(
    existing: OrgSsoConnection | null,
    command: ConfigureOrgSsoConnectionCommand,
    configuration: SsoRoutingConfiguration,
  ): OrgSsoConnection {
    const { emailDomain, zitadelOrgId, zitadelIdpId } = configuration;
    const domainVerifiedAt =
      existing?.emailDomain === emailDomain
        ? existing.domainVerifiedAt
        : new Date();
    return new OrgSsoConnection({
      id: existing?.id,
      orgId: command.orgId,
      emailDomain,
      domainVerifiedAt,
      zitadelOrgId,
      zitadelIdpId,
      enabled: existing?.enabled ?? false,
      jitProvisioningEnabled: existing?.jitProvisioningEnabled ?? false,
      createdAt: existing?.createdAt,
    });
  }
}
