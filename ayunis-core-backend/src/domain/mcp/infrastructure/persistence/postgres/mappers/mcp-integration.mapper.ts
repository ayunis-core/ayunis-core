import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../../../domain/mcp-integration.entity';
import { CustomMcpIntegration } from '../../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../../domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../../../domain/integrations/marketplace-mcp-integration.entity';
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
  MarketplaceMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from '../schema';
import { McpIntegrationRecord } from '../schema/mcp-integration.record';

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

  toDomain(record: McpIntegrationRecord): McpIntegration {
    if (!record.auth) {
      throw new Error('MCP integration record must have auth information');
    }
    const auth = this.authFromRecord(record.auth);
    const base = this.extractBaseFromRecord(record, auth);

    if (record instanceof PredefinedMcpIntegrationRecord) {
      return this.predefinedToDomain(base, record);
    }
    if (record instanceof CustomMcpIntegrationRecord) {
      return this.customToDomain(base);
    }
    if (record instanceof MarketplaceMcpIntegrationRecord) {
      return this.marketplaceToDomain(base, record);
    }
    throw new Error(
      `Unknown MCP integration record type: ${record.constructor.name}`,
    );
  }

  toRecord(entity: McpIntegration): McpIntegrationRecord {
    const authRecord = this.authToRecord(entity.auth);

    if (entity instanceof PredefinedMcpIntegration) {
      return this.predefinedToRecord(entity, authRecord);
    }
    if (entity instanceof CustomMcpIntegration) {
      return this.customToRecord(entity, authRecord);
    }
    if (entity instanceof MarketplaceMcpIntegration) {
      return this.marketplaceToRecord(entity, authRecord);
    }
    throw new Error(
      `Unknown MCP integration entity type: ${entity.constructor.name}`,
    );
  }

  private extractBaseFromRecord(
    record: McpIntegrationRecord,
    auth: McpIntegrationAuth,
  ) {
    return {
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
      returnsPii: record.returnsPii,
    } as const;
  }

  private predefinedToDomain(
    base: ReturnType<McpIntegrationMapper['extractBaseFromRecord']>,
    record: PredefinedMcpIntegrationRecord,
  ): McpIntegration {
    return this.integrationFactory.createIntegration({
      kind: McpIntegrationKind.PREDEFINED,
      ...base,
      slug: record.predefinedSlug,
    });
  }

  private customToDomain(
    base: ReturnType<McpIntegrationMapper['extractBaseFromRecord']>,
  ): McpIntegration {
    return this.integrationFactory.createIntegration({
      kind: McpIntegrationKind.CUSTOM,
      ...base,
    });
  }

  private marketplaceToDomain(
    base: ReturnType<McpIntegrationMapper['extractBaseFromRecord']>,
    record: MarketplaceMcpIntegrationRecord,
  ): McpIntegration {
    return this.integrationFactory.createIntegration({
      kind: McpIntegrationKind.MARKETPLACE,
      ...base,
      marketplaceIdentifier: record.marketplaceIdentifier,
      configSchema: record.configSchema,
      orgConfigValues: record.orgConfigValues,
      logoUrl: record.logoUrl,
    });
  }

  private applyBaseToRecord(
    record: McpIntegrationRecord,
    entity: McpIntegration,
    authRecord: McpIntegrationAuthRecord,
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
    record.returnsPii = entity.returnsPii;
    record.auth = authRecord;
    authRecord.integration = record;
  }

  private predefinedToRecord(
    entity: PredefinedMcpIntegration,
    authRecord: McpIntegrationAuthRecord,
  ): PredefinedMcpIntegrationRecord {
    const record = new PredefinedMcpIntegrationRecord();
    this.applyBaseToRecord(record, entity, authRecord);
    record.predefinedSlug = entity.slug;
    return record;
  }

  private customToRecord(
    entity: CustomMcpIntegration,
    authRecord: McpIntegrationAuthRecord,
  ): CustomMcpIntegrationRecord {
    const record = new CustomMcpIntegrationRecord();
    this.applyBaseToRecord(record, entity, authRecord);
    return record;
  }

  private marketplaceToRecord(
    entity: MarketplaceMcpIntegration,
    authRecord: McpIntegrationAuthRecord,
  ): MarketplaceMcpIntegrationRecord {
    const record = new MarketplaceMcpIntegrationRecord();
    this.applyBaseToRecord(record, entity, authRecord);
    record.marketplaceIdentifier = entity.marketplaceIdentifier;
    record.configSchema = entity.configSchema;
    record.orgConfigValues = entity.orgConfigValues;
    record.logoUrl = entity.logoUrl;
    return record;
  }

  private authFromRecord(record: McpIntegrationAuthRecord): McpIntegrationAuth {
    if (record instanceof NoAuthMcpIntegrationAuthRecord) {
      return this.noAuthFromRecord(record);
    }
    if (record instanceof BearerMcpIntegrationAuthRecord) {
      return this.bearerAuthFromRecord(record);
    }
    if (record instanceof CustomHeaderMcpIntegrationAuthRecord) {
      return this.customHeaderAuthFromRecord(record);
    }
    if (record instanceof OAuthMcpIntegrationAuthRecord) {
      return this.oauthFromRecord(record);
    }
    throw new Error(
      `Unknown MCP integration auth record type: ${record.constructor.name}`,
    );
  }

  private noAuthFromRecord(
    record: NoAuthMcpIntegrationAuthRecord,
  ): McpIntegrationAuth {
    return this.authFactory.createAuth({
      method: McpAuthMethod.NO_AUTH,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private bearerAuthFromRecord(
    record: BearerMcpIntegrationAuthRecord,
  ): McpIntegrationAuth {
    return this.authFactory.createAuth({
      method: McpAuthMethod.BEARER_TOKEN,
      authToken: record.authToken,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private customHeaderAuthFromRecord(
    record: CustomHeaderMcpIntegrationAuthRecord,
  ): McpIntegrationAuth {
    return this.authFactory.createAuth({
      method: McpAuthMethod.CUSTOM_HEADER,
      secret: record.secret,
      headerName: record.headerName,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private oauthFromRecord(
    record: OAuthMcpIntegrationAuthRecord,
  ): McpIntegrationAuth {
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

  private authToRecord(auth: McpIntegrationAuth): McpIntegrationAuthRecord {
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
