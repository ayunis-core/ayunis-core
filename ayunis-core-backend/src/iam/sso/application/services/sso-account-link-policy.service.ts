import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { emailDomainFromAddress } from 'src/iam/sso/domain/sso-connection-values';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';

@Injectable()
export class SsoAccountLinkPolicyService {
  constructor(
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly identities: FederatedIdentitiesRepository,
    private readonly users: FindUserByIdUseCase,
    private readonly config: ConfigService,
  ) {}

  async evaluate(userId: UUID, orgId: UUID) {
    const [user, connection] = await Promise.all([
      this.users.execute(new FindUserByIdQuery(userId)),
      this.connections.findByOrgId(orgId),
    ]);
    const issuer = this.config.get<string>('ssoOidc.issuer');
    const domain = emailDomainFromAddress(user.email);
    if (
      user.orgId !== orgId ||
      !connection?.enabled ||
      !connection.zitadelOrgId ||
      !issuer ||
      !domain ||
      !connection.hasEmailDomain(domain)
    ) {
      return { canLink: false, isLinked: false, connection: null };
    }
    const isLinked = await this.identities.existsByUserIdAndIssuer(
      userId,
      issuer,
    );
    return {
      canLink: connection.localPasswordLoginEnabled && !isLinked,
      isLinked,
      connection,
    };
  }
}
