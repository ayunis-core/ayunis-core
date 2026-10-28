import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { UnexpectedSessionsError } from 'src/iam/sessions/application/sessions.errors';
import type { RevokeOrgSessionsCommand } from './revoke-org-sessions.command';
@Injectable()
export class RevokeOrgSessionsUseCase {
  private readonly logger = new Logger(RevokeOrgSessionsUseCase.name);
  constructor(private readonly tokens: RefreshTokensRepository) {}
  @HandleUnexpectedErrors(UnexpectedSessionsError)
  async execute(command: RevokeOrgSessionsCommand): Promise<void> {
    this.logger.log({ orgId: command.orgId }, 'Revoking organisation sessions');
    await this.tokens.revokeAllForOrg(command.orgId);
  }
}
