import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../../../domain/mcp-integration.entity';
import { CustomMcpIntegration } from '../../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../../domain/integrations/predefined-mcp-integration.entity';
import { McpIntegrationKind } from '../../../../domain/value-objects/mcp-integration-kind.enum';
import { McpIntegrationAuth } from '../../../../domain/auth/mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../../../domain/auth/oauth-mcp-integration-auth.entity';
import {
  BearerMcpIntegrationAuthRecord,
  CustomHeaderMcpIntegrationAuthRecord,
  CustomMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from '../schema';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/value-objects/predefined-mcp-integration-slug.enum';

/**
 * Mapper for converting between MCP integration domain entities and database records.
 * Handles polymorphic entity types using Single Table Inheritance discriminator.
 */
@Injectable()
export class McpIntegrationMapper {
  /**
   * Converts a database record to a domain entity.
   * Determines the entity type from the record's class and creates the appropriate subclass.
   *
   * @param record The database record to convert
   * @returns The domain entity of the appropriate type
   * @throws Error if the record type is unknown
   */
  toDomain(record: McpIntegrationRecord): McpIntegration {
    const auth = this.authFromRecord(record.auth);

    const baseParams = {
      id: record.id,
      name: record.name,
      orgId: record.orgId,
      serverUrl: record.serverUrl,
      auth,
      enabled: record.enabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      connectionStatus: record.connectionStatus,
      lastConnectionError: record.lastConnectionError,
      lastConnectionCheck: record.lastConnectionCheck,
    } as const;

    if (record instanceof PredefinedMcpIntegrationRecord) {
      return new PredefinedMcpIntegration({
        ...baseParams,
        slug: record.predefinedSlug as PredefinedMcpIntegrationSlug,
      });
    }

    if (record instanceof CustomMcpIntegrationRecord) {
      return new CustomMcpIntegration(baseParams);
    }

    throw new Error(
      `Unknown MCP integration record type: ${record.constructor.name}`,
    );
  }

  /**
   * Converts a domain entity to a database record.
   * Creates the appropriate record subclass based on the entity's auth type.
   *
   * @param entity The domain entity to convert
   * @returns The database record of the appropriate type
   * @throws Error if the entity type is unknown
   */
  toRecord(entity: McpIntegration): McpIntegrationRecord {
    let record: McpIntegrationRecord;

    switch (entity.kind) {
      case McpIntegrationKind.PREDEFINED:
        record = new PredefinedMcpIntegrationRecord();
        record.predefinedSlug = (entity as PredefinedMcpIntegration).slug;
        break;
      case McpIntegrationKind.CUSTOM:
        record = new CustomMcpIntegrationRecord();
        record.predefinedSlug = undefined;
        break;
      default:
        throw new Error(
          `Unknown MCP integration kind: ${(entity.kind as string) ?? 'undefined'}`,
        );
    }

    this.mapCommonIntegrationFields(record, entity);

    const authRecord = this.authToRecord(entity.auth, record.id);
    authRecord.integration = record;
    record.auth = authRecord;

    return record;
  }

  /**
   * Converts a NoAuthIntegration entity to its database record.
   * @private
   */
  private authFromRecord(
    record: McpIntegrationAuthRecord | undefined,
  ): McpIntegrationAuth {
    if (!record) {
      throw new Error('Expected MCP integration auth record to be present');
    }

    if (record instanceof NoAuthMcpIntegrationAuthRecord) {
      return new NoAuthMcpIntegrationAuth({
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof BearerMcpIntegrationAuthRecord) {
      return new BearerMcpIntegrationAuth({
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        authToken: record.authToken,
      });
    }

    if (record instanceof CustomHeaderMcpIntegrationAuthRecord) {
      return new CustomHeaderMcpIntegrationAuth({
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        secret: record.secret,
        headerName: record.headerName,
      });
    }

    if (record instanceof OAuthMcpIntegrationAuthRecord) {
      return new OAuthMcpIntegrationAuth({
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        clientId: record.clientId,
        clientSecret: record.clientSecret,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        tokenExpiresAt: record.tokenExpiresAt,
      });
    }

    throw new Error(
      `Unknown MCP integration auth record type: ${record.constructor.name}`,
    );
  }

  private authToRecord(
    auth: McpIntegrationAuth,
    integrationId: string,
  ): McpIntegrationAuthRecord {
    let record: McpIntegrationAuthRecord;

    if (auth instanceof NoAuthMcpIntegrationAuth) {
      record = new NoAuthMcpIntegrationAuthRecord();
    } else if (auth instanceof BearerMcpIntegrationAuth) {
      const bearerRecord = new BearerMcpIntegrationAuthRecord();
      bearerRecord.authToken = auth.authToken;
      record = bearerRecord;
    } else if (auth instanceof CustomHeaderMcpIntegrationAuth) {
      const headerRecord = new CustomHeaderMcpIntegrationAuthRecord();
      headerRecord.secret = auth.secret;
      headerRecord.headerName = auth.headerName;
      record = headerRecord;
    } else if (auth instanceof OAuthMcpIntegrationAuth) {
      const oauthRecord = new OAuthMcpIntegrationAuthRecord();
      oauthRecord.clientId = auth.clientId;
      oauthRecord.clientSecret = auth.clientSecret;
      oauthRecord.accessToken = auth.accessToken;
      oauthRecord.refreshToken = auth.refreshToken;
      oauthRecord.tokenExpiresAt = auth.tokenExpiresAt;
      record = oauthRecord;
    } else {
      throw new Error(
        `Unknown MCP integration auth entity: ${auth.constructor.name}`,
      );
    }

    record.id = auth.id;
    record.createdAt = auth.createdAt;
    record.updatedAt = auth.updatedAt;
    record.integrationId = integrationId;

    return record;
  }

  private mapCommonIntegrationFields(
    record: McpIntegrationRecord,
    entity: McpIntegration,
  ): void {
    record.id = entity.id;
    record.orgId = entity.orgId;
    record.name = entity.name;
    record.serverUrl = entity.serverUrl;
    record.enabled = entity.enabled;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    record.connectionStatus = entity.connectionStatus;
    record.lastConnectionError = entity.lastConnectionError;
    record.lastConnectionCheck = entity.lastConnectionCheck;

    if (entity instanceof PredefinedMcpIntegration) {
      record.predefinedSlug = entity.slug;
    } else {
      record.predefinedSlug = undefined;
    }
  }
}
