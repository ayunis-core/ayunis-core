import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../../domain/mcp-integration.entity';
import {
  McpIntegrationRecord,
  PredefinedMcpIntegrationRecord,
  CustomMcpIntegrationRecord,
} from '../schema/mcp-integration.record';
import { McpAuthMethod } from '../../../../domain/mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/predefined-mcp-integration-slug.enum';

/**
 * Mapper for converting between MCP integration domain entities and database records.
 * Handles both predefined and custom integration types using single-table inheritance.
 */
export class McpIntegrationMapper {
  /**
   * Converts a database record to a domain entity.
   * @param record The database record to convert
   * @returns The domain entity
   * @throws Error if the record type is unknown
   */
  static toDomain(record: McpIntegrationRecord): McpIntegration {
    if (record instanceof PredefinedMcpIntegrationRecord) {
      return this.toPredefinedDomain(record);
    }
    if (record instanceof CustomMcpIntegrationRecord) {
      return this.toCustomDomain(record);
    }
    throw new Error('Unknown MCP integration record type');
  }

  /**
   * Converts a domain entity to a database record.
   * @param entity The domain entity to convert
   * @returns The database record
   * @throws Error if the entity type is unknown
   */
  static toRecord(entity: McpIntegration): McpIntegrationRecord {
    if (entity.type === 'predefined') {
      return this.toPredefinedRecord(entity as PredefinedMcpIntegration);
    }
    if (entity.type === 'custom') {
      return this.toCustomRecord(entity as CustomMcpIntegration);
    }
    throw new Error('Unknown MCP integration entity type');
  }

  /**
   * Converts a predefined integration record to a domain entity.
   */
  private static toPredefinedDomain(
    record: PredefinedMcpIntegrationRecord,
  ): PredefinedMcpIntegration {
    return new PredefinedMcpIntegration(
      record.id,
      record.name,
      record.organizationId,
      record.slug as PredefinedMcpIntegrationSlug,
      record.enabled,
      record.authMethod as McpAuthMethod | undefined,
      record.authHeaderName,
      record.encryptedCredentials,
      record.createdAt,
      record.updatedAt,
    );
  }

  /**
   * Converts a custom integration record to a domain entity.
   */
  private static toCustomDomain(
    record: CustomMcpIntegrationRecord,
  ): CustomMcpIntegration {
    return new CustomMcpIntegration(
      record.id,
      record.name,
      record.organizationId,
      record.serverUrl,
      record.enabled,
      record.authMethod as McpAuthMethod | undefined,
      record.authHeaderName,
      record.encryptedCredentials,
      record.createdAt,
      record.updatedAt,
    );
  }

  /**
   * Converts a predefined integration entity to a database record.
   */
  private static toPredefinedRecord(
    entity: PredefinedMcpIntegration,
  ): PredefinedMcpIntegrationRecord {
    const record = new PredefinedMcpIntegrationRecord();
    record.id = entity.id as any;
    record.name = entity.name;
    record.organizationId = entity.organizationId as any;
    record.slug = entity.slug;
    record.enabled = entity.enabled;
    record.authMethod = entity.authMethod;
    record.authHeaderName = entity.authHeaderName;
    record.encryptedCredentials = entity.encryptedCredentials;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  /**
   * Converts a custom integration entity to a database record.
   */
  private static toCustomRecord(
    entity: CustomMcpIntegration,
  ): CustomMcpIntegrationRecord {
    const record = new CustomMcpIntegrationRecord();
    record.id = entity.id as any;
    record.name = entity.name;
    record.organizationId = entity.organizationId as any;
    record.serverUrl = entity.serverUrl;
    record.enabled = entity.enabled;
    record.authMethod = entity.authMethod;
    record.authHeaderName = entity.authHeaderName;
    record.encryptedCredentials = entity.encryptedCredentials;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
