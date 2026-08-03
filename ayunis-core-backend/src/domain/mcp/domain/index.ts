export { McpIntegration } from './mcp-integration.entity';
export { McpIntegrationKind } from './value-objects/mcp-integration-kind.enum';
export { CustomMcpIntegration } from './integrations/custom-mcp-integration.entity';
export { PredefinedMcpIntegration } from './integrations/predefined-mcp-integration.entity';
export { MarketplaceMcpIntegration } from './integrations/marketplace-mcp-integration.entity';
export { McpIntegrationUserConfig } from './mcp-integration-user-config.entity';
export { McpOAuthClientRegistration } from './mcp-oauth-client-registration.entity';
export { McpOAuthUserToken } from './mcp-oauth-user-token.entity';
export { McpOAuthPendingSession } from './mcp-oauth-pending-session.entity';

export { McpIntegrationAuth } from './auth/mcp-integration-auth.entity';
export { NoAuthMcpIntegrationAuth } from './auth/no-auth-mcp-integration-auth.entity';
export { BearerMcpIntegrationAuth } from './auth/bearer-mcp-integration-auth.entity';
export { CustomHeaderMcpIntegrationAuth } from './auth/custom-header-mcp-integration-auth.entity';
export { OAuthMcpIntegrationAuth } from './auth/oauth-mcp-integration-auth.entity';

export { McpAuthMethod } from './value-objects/mcp-auth-method.enum';
export { PredefinedMcpIntegrationSlug } from './value-objects/predefined-mcp-integration-slug.enum';

export type {
  IntegrationConfigSchema,
  ConfigField,
  OAuthConfig,
} from './value-objects/integration-config-schema';
export {
  normalizeIntegrationConfigSchema,
  normalizeScopes,
} from './value-objects/integration-config-schema';
