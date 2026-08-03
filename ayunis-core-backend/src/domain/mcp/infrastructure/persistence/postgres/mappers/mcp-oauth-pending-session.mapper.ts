import { McpOAuthPendingSession } from '../../../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthPendingSessionRecord } from '../schema/mcp-oauth-pending-session.record';

export class McpOAuthPendingSessionMapper {
  static toRecord(
    entity: McpOAuthPendingSession,
  ): McpOAuthPendingSessionRecord {
    const record = new McpOAuthPendingSessionRecord();
    record.id = entity.id;
    record.stateHash = entity.stateHash;
    record.encryptedCodeVerifier = entity.encryptedCodeVerifier;
    record.redirectUri = entity.redirectUri;
    record.integrationId = entity.integrationId;
    record.orgId = entity.orgId;
    record.userId = entity.userId;
    record.issuer = entity.issuer;
    record.expiresAt = entity.expiresAt;
    record.consumedAt = entity.consumedAt;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  static toDomain(
    record: McpOAuthPendingSessionRecord,
  ): McpOAuthPendingSession {
    return new McpOAuthPendingSession({
      id: record.id,
      stateHash: record.stateHash,
      encryptedCodeVerifier: record.encryptedCodeVerifier,
      redirectUri: record.redirectUri,
      integrationId: record.integrationId,
      orgId: record.orgId,
      userId: record.userId,
      issuer: record.issuer,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
