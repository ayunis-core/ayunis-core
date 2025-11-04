import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../../../domain/mcp-integration.entity';
import { CustomMcpIntegration } from '../../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../../domain/integrations/predefined-mcp-integration.entity';
import { McpIntegrationAuth } from '../../../../domain/auth/mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../../../domain/auth/oauth-mcp-integration-auth.entity';
import { McpIntegrationFactory } from '../../../../application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../../../application/factories/mcp-integration-auth.factory';
import { McpAuthMethod } from '../../../../domain/value-objects/mcp-auth-method.enum';
import { McpIntegrationKind } from '../../../../domain/value-objects/mcp-integration-kind.enum';
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
import { UUID } from 'crypto';

/**
 * Mapper for converting between MCP integration domain entities and database records.
 * Handles polymorphic entity types using Single Table Inheritance discriminator.
 */
@Injectable()
export class McpIntegrationMapper {
  constructor(
    private readonly integrationFactory: McpIntegrationFactory,
    private readonly authFactory: McpIntegrationAuthFactory,
  ) {}
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
      return this.integrationFactory.createIntegration({
        kind: McpIntegrationKind.PREDEFINED,
        orgId: baseParams.orgId,
        name: baseParams.name,
        serverUrl: baseParams.serverUrl,
        auth: baseParams.auth,
        slug: record.predefinedSlug,
        id: baseParams.id,
        enabled: baseParams.enabled,
        createdAt: baseParams.createdAt,
        updatedAt: baseParams.updatedAt,
        connectionStatus: baseParams.connectionStatus,
        lastConnectionError: baseParams.lastConnectionError,
        lastConnectionCheck: baseParams.lastConnectionCheck,
      });
    }

    if (record instanceof CustomMcpIntegrationRecord) {
      return this.integrationFactory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId: baseParams.orgId,
        name: baseParams.name,
        serverUrl: baseParams.serverUrl,
        auth: baseParams.auth,
        id: baseParams.id,
        enabled: baseParams.enabled,
        createdAt: baseParams.createdAt,
        updatedAt: baseParams.updatedAt,
        connectionStatus: baseParams.connectionStatus,
        lastConnectionError: baseParams.lastConnectionError,
        lastConnectionCheck: baseParams.lastConnectionCheck,
      });
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
    const authRecord = this.authToRecord(entity.auth, entity.id);
    if (entity instanceof PredefinedMcpIntegration) {
      const record = new PredefinedMcpIntegrationRecord();
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
      record.predefinedSlug = entity.slug;
      record.auth = authRecord;
      authRecord.integration = record;
      return record;
    }
    if (entity instanceof CustomMcpIntegration) {
      const record = new CustomMcpIntegrationRecord();
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
      record.auth = authRecord;
      authRecord.integration = record;
      return record;
    }
    throw new Error(
      `Unknown MCP integration entity type: ${entity.constructor.name}`,
    );
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
      return this.authFactory.createAuth({
        method: McpAuthMethod.NO_AUTH,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof BearerMcpIntegrationAuthRecord) {
      return this.authFactory.createAuth({
        method: McpAuthMethod.BEARER_TOKEN,
        authToken: record.authToken,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof CustomHeaderMcpIntegrationAuthRecord) {
      return this.authFactory.createAuth({
        method: McpAuthMethod.CUSTOM_HEADER,
        secret: record.secret,
        headerName: record.headerName,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof OAuthMcpIntegrationAuthRecord) {
      return this.authFactory.createAuth({
        method: McpAuthMethod.OAUTH,
        clientId: record.clientId,
        clientSecret: record.clientSecret,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        tokenExpiresAt: record.tokenExpiresAt,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    throw new Error(
      `Unknown MCP integration auth record type: ${record.constructor.name}`,
    );
  }

  private authToRecord(
    auth: McpIntegrationAuth,
    integrationId: UUID,
  ): McpIntegrationAuthRecord {
    let record: McpIntegrationAuthRecord;

    if (auth instanceof NoAuthMcpIntegrationAuth) {
      record = new NoAuthMcpIntegrationAuthRecord();
    } else if (auth instanceof BearerMcpIntegrationAuth) {
      const bearerRecord = new BearerMcpIntegrationAuthRecord();
      bearerRecord.authToken = auth.authToken ?? '';
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

    return record;
  }
}
