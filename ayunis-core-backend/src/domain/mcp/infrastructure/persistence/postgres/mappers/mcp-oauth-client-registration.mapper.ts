import { McpOAuthClientRegistration } from '../../../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthClientRegistrationRecord } from '../schema/mcp-oauth-client-registration.record';

export class McpOAuthClientRegistrationMapper {
  static toRecord(
    entity: McpOAuthClientRegistration,
  ): McpOAuthClientRegistrationRecord {
    const record = new McpOAuthClientRegistrationRecord();
    record.id = entity.id;
    record.integrationId = entity.integrationId;
    record.issuer = entity.issuer;
    record.registrationMode = entity.registrationMode;
    record.clientId = entity.clientId;
    record.encryptedClientSecret = entity.encryptedClientSecret;
    record.clientSecretExpiresAt = entity.clientSecretExpiresAt;
    record.discoveryMetadata = entity.discoveryMetadata;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  static toDomain(
    record: McpOAuthClientRegistrationRecord,
  ): McpOAuthClientRegistration {
    return new McpOAuthClientRegistration({
      id: record.id,
      integrationId: record.integrationId,
      issuer: record.issuer,
      registrationMode: record.registrationMode,
      clientId: record.clientId,
      encryptedClientSecret: record.encryptedClientSecret,
      clientSecretExpiresAt: record.clientSecretExpiresAt,
      discoveryMetadata: record.discoveryMetadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
