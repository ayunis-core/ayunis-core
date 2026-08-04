import { McpOAuthUserToken } from '../../../../domain/mcp-oauth-user-token.entity';
import { McpOAuthUserTokenRecord } from '../schema/mcp-oauth-user-token.record';

export class McpOAuthUserTokenMapper {
  static toRecord(entity: McpOAuthUserToken): McpOAuthUserTokenRecord {
    const record = new McpOAuthUserTokenRecord();
    record.id = entity.id;
    record.integrationId = entity.integrationId;
    record.userId = entity.userId;
    record.issuer = entity.issuer;
    record.encryptedAccessToken = entity.encryptedAccessToken;
    record.encryptedRefreshToken = entity.encryptedRefreshToken;
    record.expiresAt = entity.expiresAt;
    record.tokenType = entity.tokenType;
    record.scopes = [...entity.scopes];
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  static toDomain(record: McpOAuthUserTokenRecord): McpOAuthUserToken {
    return new McpOAuthUserToken({
      id: record.id,
      integrationId: record.integrationId,
      userId: record.userId,
      issuer: record.issuer,
      encryptedAccessToken: record.encryptedAccessToken,
      encryptedRefreshToken: record.encryptedRefreshToken,
      expiresAt: record.expiresAt,
      tokenType: record.tokenType,
      scopes: record.scopes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
