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
  | {
      success: true;
      integrationId: UUID;
      frontendRedirectPath: string | null;
      level: 'org' | 'user';
    }
  | {
      success: false;
      reason: string;
      frontendRedirectPath: string | null;
      level: 'org' | 'user' | null;
    };

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
    const authorizationContext =
      this.oauthFlowService.resolveAuthorizationContext(command.state);

    try {
      const result = await this.oauthFlowService.handleCallback(
        command.code,
        command.state,
      );

      return {
        success: true,
        integrationId: result.integrationId,
        frontendRedirectPath: result.frontendRedirectPath,
        level: result.level,
      };
    } catch (error) {
      if (
        error instanceof McpOAuthExchangeFailedError ||
        error instanceof McpOAuthStateInvalidError
      ) {
        return {
          success: false,
          reason: error.message,
          frontendRedirectPath:
            authorizationContext?.frontendRedirectPath ?? null,
          level: authorizationContext?.level ?? null,
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
