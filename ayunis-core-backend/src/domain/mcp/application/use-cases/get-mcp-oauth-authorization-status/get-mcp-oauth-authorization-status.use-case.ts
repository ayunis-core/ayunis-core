import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetMcpOAuthAuthorizationStatusQuery } from './get-mcp-oauth-authorization-status.query';
import { OAuthFlowService } from '../../services/oauth-flow.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpInvalidConfigSchemaError,
  McpUnauthenticatedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';

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

  constructor(
    private readonly oauthFlowService: OAuthFlowService,
    private readonly validateAccess: ValidateIntegrationAccessService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetMcpOAuthAuthorizationStatusQuery,
  ): Promise<OAuthAuthorizationStatusResult> {
    this.logger.log('getMcpOAuthAuthorizationStatus', {
      integrationId: query.integrationId,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new McpUnauthenticatedError();
      }

      const userId = this.contextService.get('userId');

      const integration = await this.validateAccess.validate(
        query.integrationId,
        { requireEnabled: false },
      );

      const configSchema = this.extractConfigSchema(integration);
      if (!configSchema?.oauth) {
        throw new McpInvalidConfigSchemaError(
          'Integration does not have OAuth configured',
        );
      }

      const level = configSchema.oauth.level;
      const userIdOrNull: UUID | null =
        level === 'user' ? (userId ?? null) : null;

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

  private extractConfigSchema(
    integration: unknown,
  ): IntegrationConfigSchema | undefined {
    if (
      integration &&
      typeof integration === 'object' &&
      'configSchema' in integration
    ) {
      return (integration as { configSchema: IntegrationConfigSchema })
        .configSchema;
    }
    return undefined;
  }
}
