import { Transactional } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import {
  OrgSsoConnectionsRepository,
  SsoConnectionUniqueConstraintError,
  type OrgSsoConnectionDomainState,
} from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoConfigurationError,
  SsoConnectionChangedError,
  SsoConnectionConflictError,
  SsoConnectionMustBeDisabledError,
  SsoConnectionNotFoundError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';
import {
  OrgSsoConnection,
  type SsoEmailDomain,
} from 'src/iam/sso/domain/org-sso-connection.entity';
import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';
import {
  normalizeEmailDomains,
  normalizeZitadelIdpId,
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';

interface SsoRoutingConfiguration {
  emailDomains: string[];
  zitadelOrgId: string;
  zitadelIdpId: string | null;
}

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
    this.logger.info(
      { orgId: command.orgId, domainCount: input.emailDomains.length },
      'Configuring organization SSO connection',
    );
    await this.findOrgById.execute(new FindOrgByIdQuery(command.orgId));
    const [existingState, domainOwnerOrgIds] = await Promise.all([
      this.repository.findByOrgIdWithDomainState(command.orgId),
      this.repository.findOwnerOrgIdsByEmailDomains(input.emailDomains),
    ]);
    const existing = existingState?.connection ?? null;
    this.assertDomainsAvailable(command.orgId, domainOwnerOrgIds);
    const configuration = this.resolveConfiguration(existing, input);
    const current = this.currentConfiguration(existingState, configuration);
    if (current) return current;
    if (existing?.enabled) {
      throw new SsoConnectionMustBeDisabledError(command.orgId);
    }
    const connection = this.updatedConnection(
      existing,
      command.orgId,
      configuration,
    );
    return this.persistConfiguration(
      connection,
      existing,
      configuration,
      this.requiresDomainRepair(existingState),
    );
  }

  private currentConfiguration(
    state: OrgSsoConnectionDomainState | null,
    configuration: SsoRoutingConfiguration,
  ): OrgSsoConnection | null {
    if (!state?.hasCanonicalEmailDomains) return null;
    return this.matches(state.connection, configuration)
      ? state.connection
      : null;
  }

  private requiresDomainRepair(
    state: OrgSsoConnectionDomainState | null,
  ): boolean {
    return state !== null && !state.hasCanonicalEmailDomains;
  }

  private async persistConfiguration(
    connection: OrgSsoConnection,
    existing: OrgSsoConnection | null,
    configuration: SsoRoutingConfiguration,
    requiresDomainRepair: boolean,
  ): Promise<OrgSsoConnection> {
    if (!existing) return this.createConnection(connection);
    const updated = await this.updateConnection(connection, existing);
    return (
      updated ??
      this.handleConcurrentChange(
        connection.orgId,
        configuration,
        requiresDomainRepair,
      )
    );
  }

  private async createConnection(
    connection: OrgSsoConnection,
  ): Promise<OrgSsoConnection> {
    try {
      return await this.repository.save(connection);
    } catch (error: unknown) {
      if (!(error instanceof SsoConnectionUniqueConstraintError)) throw error;
      const currentState = await this.repository.findByOrgIdWithDomainState(
        connection.orgId,
      );
      if (currentState && this.matches(currentState.connection, connection)) {
        return this.resolveConcurrentCreate(currentState, connection);
      }
      throw new SsoConnectionConflictError(
        currentState ? 'orgId' : error.field,
      );
    }
  }

  private async resolveConcurrentCreate(
    observed: OrgSsoConnectionDomainState,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection> {
    const current = observed.connection;
    if (observed.hasCanonicalEmailDomains) return current;
    if (current.enabled) {
      throw new SsoConnectionMustBeDisabledError(current.orgId);
    }
    const repaired = await this.updateConnection(current, current);
    return (
      repaired ?? this.handleConcurrentChange(current.orgId, expected, true)
    );
  }

  private async updateConnection(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null> {
    try {
      return await this.persistUpdate(connection, expected);
    } catch (error: unknown) {
      if (error instanceof SsoConnectionUniqueConstraintError) {
        throw new SsoConnectionConflictError(error.field);
      }
      throw error;
    }
  }

  @Transactional()
  private persistUpdate(
    connection: OrgSsoConnection,
    expected: OrgSsoConnection,
  ): Promise<OrgSsoConnection | null> {
    return this.repository.updateConfigurationIfDisabled(connection, expected);
  }

  private async handleConcurrentChange(
    orgId: ConfigureOrgSsoConnectionCommand['orgId'],
    configuration: SsoRoutingConfiguration | OrgSsoConnection,
    requiresDomainRepair: boolean,
  ): Promise<OrgSsoConnection> {
    const currentState =
      await this.repository.findByOrgIdWithDomainState(orgId);
    if (!currentState) throw new SsoConnectionNotFoundError(orgId);
    if (
      this.matches(currentState.connection, configuration) &&
      (!requiresDomainRepair || currentState.hasCanonicalEmailDomains)
    ) {
      return currentState.connection;
    }
    if (currentState.connection.enabled) {
      throw new SsoConnectionMustBeDisabledError(orgId);
    }
    throw new SsoConnectionChangedError(orgId);
  }

  private normalizeConfiguration(
    command: ConfigureOrgSsoConnectionCommand,
  ): SsoRoutingConfigurationInput {
    try {
      return {
        emailDomains: normalizeEmailDomains(command.emailDomains),
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
    if (input.zitadelIdpId !== undefined) {
      return { ...input, zitadelIdpId: input.zitadelIdpId };
    }
    const mappingUnchanged =
      existing !== null &&
      existing.matchesEmailDomains(input.emailDomains) &&
      existing.zitadelOrgId === input.zitadelOrgId;
    return {
      ...input,
      zitadelIdpId: mappingUnchanged ? existing.zitadelIdpId : null,
    };
  }

  private assertDomainsAvailable(
    orgId: ConfigureOrgSsoConnectionCommand['orgId'],
    domainOwnerOrgIds: ConfigureOrgSsoConnectionCommand['orgId'][],
  ): void {
    if (domainOwnerOrgIds.some((ownerOrgId) => ownerOrgId !== orgId)) {
      throw new SsoConnectionConflictError('emailDomains');
    }
  }

  private matches(
    existing: OrgSsoConnection,
    configuration: SsoRoutingConfiguration | OrgSsoConnection,
  ): boolean {
    return (
      existing.matchesEmailDomains(
        configuration instanceof OrgSsoConnection
          ? configuration.emailDomains.map(({ emailDomain }) => emailDomain)
          : configuration.emailDomains,
      ) &&
      existing.zitadelOrgId === configuration.zitadelOrgId &&
      existing.zitadelIdpId === configuration.zitadelIdpId
    );
  }

  private updatedConnection(
    existing: OrgSsoConnection | null,
    orgId: ConfigureOrgSsoConnectionCommand['orgId'],
    configuration: SsoRoutingConfiguration,
  ): OrgSsoConnection {
    return new OrgSsoConnection({
      id: existing?.id,
      orgId,
      emailDomains: this.verifiedDomains(existing, configuration.emailDomains),
      zitadelOrgId: configuration.zitadelOrgId,
      zitadelIdpId: configuration.zitadelIdpId,
      enabled: existing?.enabled ?? false,
      jitProvisioningEnabled: existing?.jitProvisioningEnabled ?? false,
      createdAt: existing?.createdAt,
    });
  }

  private verifiedDomains(
    existing: OrgSsoConnection | null,
    emailDomains: string[],
  ): SsoEmailDomain[] {
    const existingVerification = new Map(
      existing?.emailDomains.map(({ emailDomain, verifiedAt }) => [
        emailDomain,
        verifiedAt,
      ]),
    );
    const verifiedAt = new Date();
    return emailDomains.map((emailDomain) => ({
      emailDomain,
      verifiedAt: existingVerification.get(emailDomain) ?? verifiedAt,
    }));
  }
}
