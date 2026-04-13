import { Injectable, Logger } from '@nestjs/common';
import { StartMcpOAuthAuthorizationCommand } from './start-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class StartMcpOAuthAuthorizationUseCase {
  private readonly logger = new Logger(StartMcpOAuthAuthorizationUseCase.name);

  constructor(private readonly oauthFlowService: OAuthFlowService) {}

  async execute(
    command: StartMcpOAuthAuthorizationCommand,
  ): Promise<{ authorizationUrl: string }> {
    this.logger.log('startMcpOAuthAuthorization', {
      integrationId: command.integrationId,
    });

    try {
      const { integration, level, orgId, userIdOrNull } =
        await this.oauthFlowService.resolveOAuthActor(command.integrationId);

      const { url } = this.oauthFlowService.buildAuthorizationUrl(
        integration,
        level,
        orgId,
        userIdOrNull,
      );

      return { authorizationUrl: url };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error starting OAuth authorization', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
