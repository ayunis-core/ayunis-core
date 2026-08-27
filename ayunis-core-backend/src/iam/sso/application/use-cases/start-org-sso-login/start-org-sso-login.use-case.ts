import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { SsoAuthorizationTransactionService } from 'src/iam/sso/application/services/sso-authorization-transaction.service';
import {
  SsoConnectionNotAvailableError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { StartOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.command';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';

@Injectable()
export class StartOrgSsoLoginUseCase {
  constructor(
    @InjectPinoLogger(StartOrgSsoLoginUseCase.name)
    private readonly logger: PinoLogger,
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly authorizationTransactions: SsoAuthorizationTransactionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: StartOrgSsoLoginCommand,
  ): Promise<{ authorizationUrl: string; browserBinding: string }> {
    this.logger.info(
      { orgId: command.orgId },
      'Starting organization SSO login',
    );
    const connection = await this.connections.findByOrgId(command.orgId);
    if (!connection?.enabled || !connection.zitadelOrgId) {
      throw new SsoConnectionNotAvailableError();
    }
    return this.authorizationTransactions.start({
      orgId: connection.orgId,
      zitadelOrgId: connection.zitadelOrgId,
      zitadelIdpId: connection.zitadelIdpId,
      purpose: SsoLoginPurpose.LOGIN,
      linkUserId: null,
    });
  }
}
