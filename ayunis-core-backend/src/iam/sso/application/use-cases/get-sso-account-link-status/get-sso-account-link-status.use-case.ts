import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SsoAccountLinkPolicyService } from 'src/iam/sso/application/services/sso-account-link-policy.service';
import { UnexpectedSsoError } from 'src/iam/sso/application/sso.errors';
import { GetSsoAccountLinkStatusQuery } from './get-sso-account-link-status.query';

@Injectable()
export class GetSsoAccountLinkStatusUseCase {
  private readonly logger = new Logger(GetSsoAccountLinkStatusUseCase.name);

  constructor(private readonly policy: SsoAccountLinkPolicyService) {}

  @HandleUnexpectedErrors(UnexpectedSsoError, { databaseUnavailable: true })
  async execute(query: GetSsoAccountLinkStatusQuery) {
    this.logger.log(
      { userId: query.userId },
      'Reading SSO account link status',
    );
    const { canLink, isLinked } = await this.policy.evaluate(
      query.userId,
      query.orgId,
    );
    return { canLink, isLinked };
  }
}
