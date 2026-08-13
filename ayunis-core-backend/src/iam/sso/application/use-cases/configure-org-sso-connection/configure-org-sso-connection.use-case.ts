import { Injectable, Logger } from '@nestjs/common';
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
  normalizeZitadelOrgId,
} from 'src/iam/sso/domain/sso-connection-values';
import { ConfigureOrgSsoConnectionCommand } from 'src/iam/sso/application/use-cases/configure-org-sso-connection/configure-org-sso-connection.command';

@Injectable()
export class ConfigureOrgSsoConnectionUseCase {
  private readonly logger = new Logger(ConfigureOrgSsoConnectionUseCase.name);

  constructor(
    private readonly repository: OrgSsoConnectionsRepository,
    private readonly findOrgById: FindOrgByIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: ConfigureOrgSsoConnectionCommand,
  ): Promise<OrgSsoConnection> {
    const { emailDomain, zitadelOrgId } = this.normalizeConfiguration(command);
    this.logger.log('Configuring organization SSO connection', {
      orgId: command.orgId,
      emailDomain,
    });

    await this.findOrgById.execute(new FindOrgByIdQuery(command.orgId));
    const [existing, domainOwner, zitadelOrgOwner] = await Promise.all([
      this.repository.findByOrgId(command.orgId),
      this.repository.findByEmailDomain(emailDomain),
      this.repository.findByZitadelOrgId(zitadelOrgId),
    ]);
    this.assertMappingAvailable(command, domainOwner, zitadelOrgOwner);

    if (existing && this.matches(existing, emailDomain, zitadelOrgId)) {
      return existing;
    }
    // Past this point any existing connection's mapping differs, because an
    // identical one returned above.
    if (existing?.enabled) {
      throw new SsoConnectionMustBeDisabledError(command.orgId);
    }

    if (!existing) {
      return this.createConnection(
        this.updatedConnection(null, command, emailDomain, zitadelOrgId),
      );
    }

    const updated = await this.updateConnection(
      this.updatedConnection(existing, command, emailDomain, zitadelOrgId),
      existing,
    );
    if (!updated) {
      return this.handleConcurrentConfigurationChange(
        command.orgId,
        emailDomain,
        zitadelOrgId,
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
      if (
        current &&
        this.matches(current, connection.emailDomain, connection.zitadelOrgId)
      ) {
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
    emailDomain: string,
    zitadelOrgId: string,
  ): Promise<OrgSsoConnection> {
    const current = await this.repository.findByOrgId(orgId);
    if (!current) {
      throw new SsoConnectionNotFoundError(orgId);
    }
    if (this.matches(current, emailDomain, zitadelOrgId)) {
      return current;
    }
    if (current.enabled) {
      throw new SsoConnectionMustBeDisabledError(orgId);
    }
    throw new SsoConnectionChangedError(orgId);
  }

  private normalizeConfiguration(command: ConfigureOrgSsoConnectionCommand): {
    emailDomain: string;
    zitadelOrgId: string;
  } {
    try {
      return {
        emailDomain: normalizeEmailDomain(command.emailDomain),
        zitadelOrgId: normalizeZitadelOrgId(command.zitadelOrgId),
      };
    } catch (error: unknown) {
      if (error instanceof InvalidSsoConnectionValueError) {
        throw new InvalidSsoConfigurationError(error.field);
      }
      throw error;
    }
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
    emailDomain: string,
    zitadelOrgId: string | null,
  ): boolean {
    return (
      existing.emailDomain === emailDomain &&
      existing.zitadelOrgId === zitadelOrgId
    );
  }

  private updatedConnection(
    existing: OrgSsoConnection | null,
    command: ConfigureOrgSsoConnectionCommand,
    emailDomain: string,
    zitadelOrgId: string,
  ): OrgSsoConnection {
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
      enabled: existing?.enabled ?? false,
      jitProvisioningEnabled: existing?.jitProvisioningEnabled ?? false,
      createdAt: existing?.createdAt,
    });
  }
}
