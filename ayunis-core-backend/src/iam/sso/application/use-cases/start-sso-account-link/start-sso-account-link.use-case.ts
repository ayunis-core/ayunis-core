import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { SsoAuthorizationTransactionService } from 'src/iam/sso/application/services/sso-authorization-transaction.service';
import {
  SsoConnectionNotAvailableError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { StartSsoAccountLinkCommand } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.command';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';

@Injectable()
export class StartSsoAccountLinkUseCase {
  private readonly logger = new Logger(StartSsoAccountLinkUseCase.name);

  constructor(
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly authorizationTransactions: SsoAuthorizationTransactionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: StartSsoAccountLinkCommand) {
    this.logger.log('Starting SSO account linking', {
      userId: command.userId,
      orgId: command.orgId,
    });
    const connection = await this.connections.findByOrgId(command.orgId);
    if (!connection?.enabled || !connection.zitadelOrgId) {
      throw new SsoConnectionNotAvailableError();
    }
    return this.authorizationTransactions.start({
      orgId: connection.orgId,
      zitadelOrgId: connection.zitadelOrgId,
      purpose: SsoLoginPurpose.LINK,
      linkUserId: command.userId,
    });
  }
}
