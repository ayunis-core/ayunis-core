import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import { RevokePasswordSessionsForOrgCommand } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.command';

@Injectable()
export class RevokePasswordSessionsForOrgUseCase {
  private readonly logger = new Logger(
    RevokePasswordSessionsForOrgUseCase.name,
  );

  constructor(private readonly refreshTokens: RefreshTokensRepository) {}

  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokePasswordSessionsForOrgCommand): Promise<void> {
    this.logger.log({ orgId: command.orgId }, 'execute');
    await this.refreshTokens.revokePasswordSessionsForOrg(command.orgId);
  }
}
