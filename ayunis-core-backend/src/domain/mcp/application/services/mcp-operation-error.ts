import type { PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import type { McpIntegration } from '../../domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import {
  McpAuthenticationError,
  McpUserAuthorizationRequiredError,
} from '../mcp.errors';
import type { McpOAuthUserTokenRepositoryPort } from '../ports/mcp-oauth-user-token.repository.port';
import type { McpCapabilityCacheService } from './mcp-capability-cache.service';

interface McpOperationErrorContext {
  error: unknown;
  integration: McpIntegration;
  operation: string;
  userId?: UUID;
  oauthTokens?: McpOAuthUserTokenRepositoryPort;
  capabilityCache?: McpCapabilityCacheService;
  logger: PinoLogger;
}

export async function handleMcpOperationError({
  error,
  integration,
  operation,
  userId,
  oauthTokens,
  capabilityCache,
  logger,
}: McpOperationErrorContext): Promise<never> {
  if (isOAuthAuthorizationFailure(error, integration, userId)) {
    await oauthTokens?.delete(integration.id, userId as UUID);
    capabilityCache?.invalidate(integration.id, userId);
    throw new McpUserAuthorizationRequiredError(
      integration.id,
      integration.name,
    );
  }
  if ((error as { status?: number }).status === 401) {
    logger.warn(
      { integrationId: integration.id, operation },
      'Authentication failed for MCP operation',
    );
    integration.updateConnectionStatus('error', 'Authentication failed');
    throw new McpAuthenticationError('Invalid authentication credentials');
  }
  logger.error(
    { err: error as Error, integrationId: integration.id, operation },
    'Failed to execute MCP operation',
  );
  throw error;
}

function isOAuthAuthorizationFailure(
  error: unknown,
  integration: McpIntegration,
  userId?: UUID,
): boolean {
  if (
    !userId ||
    !(integration instanceof SchemaConfiguredMcpIntegration) ||
    !integration.configSchema.oauth
  ) {
    return false;
  }
  const name = error instanceof Error ? error.name : '';
  return (
    (error as { status?: number }).status === 401 ||
    [
      'InsufficientScopeError',
      'IssuerMismatchError',
      'AuthorizationServerMismatchError',
    ].includes(name)
  );
}
