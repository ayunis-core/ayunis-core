import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
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
      jitProvisioningEnabled: command.jitProvisioningEnabled,
    });

    await this.findOrgById.execute(new FindOrgByIdQuery(command.orgId));
    const [existing, domainOwner, zitadelOrgOwner] = await Promise.all([
      this.repository.findByOrgId(command.orgId),
      this.repository.findByEmailDomain(emailDomain),
      this.repository.findByZitadelOrgId(zitadelOrgId),
    ]);
    this.assertMappingAvailable(command, domainOwner, zitadelOrgOwner);

    if (
      existing &&
      this.matches(existing, command, emailDomain, zitadelOrgId)
    ) {
      return existing;
    }
    const mappingChanged = existing
      ? this.mappingChanged(existing, emailDomain, zitadelOrgId)
      : false;
    if (existing?.enabled && mappingChanged) {
      throw new SsoConnectionMustBeDisabledError(command.orgId);
    }

    if (!existing) {
      return this.repository.save(
        this.updatedConnection(null, command, emailDomain, zitadelOrgId),
      );
    }
    if (!mappingChanged) {
      return this.updateJitProvisioning(existing, command);
    }

    const updated = await this.repository.updateConfigurationIfDisabled(
      this.updatedConnection(existing, command, emailDomain, zitadelOrgId),
      existing,
    );
    if (!updated) {
      return this.handleConcurrentConfigurationChange(command.orgId);
    }
    return updated;
  }

  private async handleConcurrentConfigurationChange(
    orgId: ConfigureOrgSsoConnectionCommand['orgId'],
  ): Promise<never> {
    const current = await this.repository.findByOrgId(orgId);
    if (!current) {
      throw new SsoConnectionNotFoundError(orgId);
    }
    if (current.enabled) {
      throw new SsoConnectionMustBeDisabledError(orgId);
    }
    throw new SsoConnectionChangedError(orgId);
  }

  private async updateJitProvisioning(
    existing: OrgSsoConnection,
    command: ConfigureOrgSsoConnectionCommand,
  ): Promise<OrgSsoConnection> {
    const updated =
      await this.repository.setJitProvisioningEnabledIfMappingMatches(
        existing,
        command.jitProvisioningEnabled,
      );
    if (!updated) {
      return this.handleConcurrentConfigurationChange(command.orgId);
    }
    return updated;
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
    command: ConfigureOrgSsoConnectionCommand,
    emailDomain: string,
    zitadelOrgId: string,
  ): boolean {
    return (
      existing.emailDomain === emailDomain &&
      existing.zitadelOrgId === zitadelOrgId &&
      existing.jitProvisioningEnabled === command.jitProvisioningEnabled
    );
  }

  private mappingChanged(
    existing: OrgSsoConnection,
    emailDomain: string,
    zitadelOrgId: string,
  ): boolean {
    return (
      existing.emailDomain !== emailDomain ||
      existing.zitadelOrgId !== zitadelOrgId
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
      jitProvisioningEnabled: command.jitProvisioningEnabled,
      createdAt: existing?.createdAt,
    });
  }
}
