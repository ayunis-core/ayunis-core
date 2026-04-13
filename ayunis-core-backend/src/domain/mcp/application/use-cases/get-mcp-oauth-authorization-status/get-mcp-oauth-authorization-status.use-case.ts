import { Injectable, Logger } from '@nestjs/common';
import { GetMcpOAuthAuthorizationStatusQuery } from './get-mcp-oauth-authorization-status.query';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export interface OAuthAuthorizationStatusResult {
  level: 'org' | 'user';
  authorized: boolean;
  expiresAt: Date | null;
  scope: string | null;
}

@Injectable()
export class GetMcpOAuthAuthorizationStatusUseCase {
  private readonly logger = new Logger(
    GetMcpOAuthAuthorizationStatusUseCase.name,
  );

  constructor(private readonly oauthFlowService: OAuthFlowService) {}

  async execute(
    query: GetMcpOAuthAuthorizationStatusQuery,
  ): Promise<OAuthAuthorizationStatusResult> {
    this.logger.log('getMcpOAuthAuthorizationStatus', {
      integrationId: query.integrationId,
    });

    try {
      const { integration, level, userIdOrNull } =
        await this.oauthFlowService.resolveOAuthActor(query.integrationId);

      const status = await this.oauthFlowService.getStatus(
        integration.id,
        userIdOrNull,
      );

      return {
        level,
        ...status,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error getting OAuth status', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
