import { Injectable, Logger } from '@nestjs/common';
import { RevokeMcpOAuthAuthorizationCommand } from './revoke-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class RevokeMcpOAuthAuthorizationUseCase {
  private readonly logger = new Logger(RevokeMcpOAuthAuthorizationUseCase.name);

  constructor(private readonly oauthFlowService: OAuthFlowService) {}

  async execute(command: RevokeMcpOAuthAuthorizationCommand): Promise<void> {
    this.logger.log('revokeMcpOAuthAuthorization', {
      integrationId: command.integrationId,
    });

    try {
      const { integration, userIdOrNull } =
        await this.oauthFlowService.resolveOAuthActor(command.integrationId);

      await this.oauthFlowService.revoke(integration.id, userIdOrNull);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error revoking OAuth authorization', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
