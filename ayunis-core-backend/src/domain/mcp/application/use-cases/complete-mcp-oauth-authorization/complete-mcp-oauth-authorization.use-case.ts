import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CompleteMcpOAuthAuthorizationCommand } from './complete-mcp-oauth-authorization.command';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import {
  McpOAuthExchangeFailedError,
  McpOAuthStateInvalidError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export type CompleteMcpOAuthResult =
  | { success: true; integrationId: UUID }
  | { success: false; reason: string };

@Injectable()
export class CompleteMcpOAuthAuthorizationUseCase {
  private readonly logger = new Logger(
    CompleteMcpOAuthAuthorizationUseCase.name,
  );

  constructor(private readonly oauthFlowService: OAuthFlowService) {}

  async execute(
    command: CompleteMcpOAuthAuthorizationCommand,
  ): Promise<CompleteMcpOAuthResult> {
    this.logger.log('completeMcpOAuthAuthorization');

    try {
      const result = await this.oauthFlowService.handleCallback(
        command.code,
        command.state,
      );

      return {
        success: true,
        integrationId: result.integrationId,
      };
    } catch (error) {
      if (
        error instanceof McpOAuthExchangeFailedError ||
        error instanceof McpOAuthStateInvalidError
      ) {
        return {
          success: false,
          reason: error.message,
        };
      }
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error completing OAuth authorization', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
