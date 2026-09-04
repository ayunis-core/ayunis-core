import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';

export interface OrgAuthenticationPolicy {
  localPasswordLoginEnabled: boolean;
}

@Injectable()
export class GetOrgAuthenticationPolicyUseCase {
  private readonly logger = new Logger(GetOrgAuthenticationPolicyUseCase.name);

  constructor(private readonly connections: OrgSsoConnectionsRepository) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    query: GetOrgAuthenticationPolicyQuery,
  ): Promise<OrgAuthenticationPolicy> {
    this.logger.log({ orgId: query.orgId }, 'execute');
    const enabled = query.lockForSessionIssuance
      ? await this.connections.findLocalPasswordLoginEnabledByOrgIdForSessionIssuance(
          query.orgId,
        )
      : await this.connections.findLocalPasswordLoginEnabledByOrgId(
          query.orgId,
        );
    return { localPasswordLoginEnabled: enabled ?? true };
  }
}
