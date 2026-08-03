import type { UUID } from 'crypto';
import type { McpOAuthClientRegistration } from '../../domain/mcp-oauth-client-registration.entity';

export abstract class McpOAuthClientRegistrationRepositoryPort {
  abstract findByIntegrationAndIssuer(
    integrationId: UUID,
    issuer: string,
  ): Promise<McpOAuthClientRegistration | null>;

  abstract findUnboundByIntegration(
    integrationId: UUID,
  ): Promise<McpOAuthClientRegistration | null>;

  abstract hasStaticRegistration(integrationId: UUID): Promise<boolean>;

  abstract save(
    registration: McpOAuthClientRegistration,
  ): Promise<McpOAuthClientRegistration>;

  abstract bindUnboundToIssuer(
    integrationId: UUID,
    issuer: string,
  ): Promise<McpOAuthClientRegistration | null>;

  abstract deleteByIntegration(integrationId: UUID): Promise<void>;

  abstract deleteByIntegrationExcept(
    integrationId: UUID,
    registrationId: UUID,
  ): Promise<void>;
}
