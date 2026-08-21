import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  InvalidSsoDiscoveryEmailError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { DiscoverOrgSsoQuery } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.query';
import { emailDomainFromAddress } from 'src/iam/sso/domain/sso-connection-values';

export type SsoDiscoveryResult =
  { available: false } | { available: true; orgId: string };

@Injectable()
export class DiscoverOrgSsoUseCase {
  constructor(
    @InjectPinoLogger(DiscoverOrgSsoUseCase.name)
    private readonly logger: PinoLogger,
    private readonly connections: OrgSsoConnectionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(query: DiscoverOrgSsoQuery): Promise<SsoDiscoveryResult> {
    this.logger.info('Discovering organization SSO connection');
    const domain = this.emailDomain(query.email);
    const connection = await this.connections.findByEmailDomain(domain);
    if (!connection?.enabled || !connection.zitadelOrgId) {
      return { available: false };
    }
    return { available: true, orgId: connection.orgId };
  }

  private emailDomain(email: string): string {
    const domain = emailDomainFromAddress(email);
    if (!domain) {
      throw new InvalidSsoDiscoveryEmailError();
    }
    return domain;
  }
}
