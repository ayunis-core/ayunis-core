import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class LocalPasswordLoginPolicyService {
  constructor(
    private readonly getOrgAuthenticationPolicy: GetOrgAuthenticationPolicyUseCase,
    private readonly findUserById: FindUserByIdUseCase,
  ) {}

  async assertAllowedForOrg(
    orgId: UUID,
    authenticationMethod: SessionAuthenticationMethod,
  ): Promise<void> {
    if (authenticationMethod === SessionAuthenticationMethod.SSO) return;
    const policy = await this.getOrgAuthenticationPolicy.execute(
      new GetOrgAuthenticationPolicyQuery(orgId),
    );
    if (!policy.localPasswordLoginEnabled) {
      throw new LocalPasswordLoginDisabledError();
    }
  }

  async assertAllowedForUser(
    userId: UUID,
    authenticationMethod: SessionAuthenticationMethod,
  ): Promise<User> {
    const user = await this.findUserById.execute(new FindUserByIdQuery(userId));
    await this.assertAllowedForOrg(user.orgId, authenticationMethod);
    return user;
  }

  async assertSessionIssuanceAllowed(
    orgId: UUID,
    authenticationMethod: SessionAuthenticationMethod,
  ): Promise<void> {
    if (authenticationMethod === SessionAuthenticationMethod.SSO) return;
    const policy = await this.getOrgAuthenticationPolicy.execute(
      new GetOrgAuthenticationPolicyQuery(orgId, true),
    );
    if (!policy.localPasswordLoginEnabled) {
      throw new LocalPasswordLoginDisabledError();
    }
  }
}
