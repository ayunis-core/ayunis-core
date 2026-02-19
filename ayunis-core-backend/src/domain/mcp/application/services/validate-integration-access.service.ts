import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { McpIntegrationsRepositoryPort } from '../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpUnauthenticatedError,
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
} from '../mcp.errors';

/**
 * Shared validation logic for MCP integration access.
 * Verifies: user is authenticated, integration exists, org ownership, and enabled state.
 */
@Injectable()
export class ValidateIntegrationAccessService {
  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async validate(
    integrationId: string,
    options: { requireEnabled?: boolean } = { requireEnabled: true },
  ): Promise<McpIntegration> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new McpUnauthenticatedError();
    }

    const integration = await this.repository.findById(integrationId as UUID);
    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(
        integrationId,
        integration.name,
      );
    }

    if (options.requireEnabled && !integration.enabled) {
      throw new McpIntegrationDisabledError(integrationId, integration.name);
    }

    return integration;
  }
}
