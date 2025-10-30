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
import { Injectable } from '@nestjs/common';

/**
 * Mapper for converting between MCP integration domain entities and database records.
 * Handles both predefined and custom integration types using single-table inheritance.
 */
@Injectable()
export class McpIntegrationMapper {
  /**
   * Converts a database record to a domain entity.
   * @param record The database record to convert
   * @returns The domain entity
   * @throws Error if the record type is unknown
   */
  toDomain(record: McpIntegrationRecord): McpIntegration {
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
  toRecord(entity: McpIntegration): McpIntegrationRecord {
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
  private toPredefinedDomain(
    record: PredefinedMcpIntegrationRecord,
  ): PredefinedMcpIntegration {
    return new PredefinedMcpIntegration({
      id: record.id,
      name: record.name,
      organizationId: record.organizationId,
      slug: record.slug as PredefinedMcpIntegrationSlug,
      enabled: record.enabled,
      authMethod: record.authMethod as McpAuthMethod | undefined,
      authHeaderName: record.authHeaderName,
      encryptedCredentials: record.encryptedCredentials,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Converts a custom integration record to a domain entity.
   */
  private toCustomDomain(
    record: CustomMcpIntegrationRecord,
  ): CustomMcpIntegration {
    return new CustomMcpIntegration({
      id: record.id,
      name: record.name,
      organizationId: record.organizationId,
      serverUrl: record.serverUrl,
      enabled: record.enabled,
      authMethod: record.authMethod as McpAuthMethod | undefined,
      authHeaderName: record.authHeaderName,
      encryptedCredentials: record.encryptedCredentials,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Converts a predefined integration entity to a database record.
   */
  private toPredefinedRecord(
    entity: PredefinedMcpIntegration,
  ): PredefinedMcpIntegrationRecord {
    const record = new PredefinedMcpIntegrationRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.organizationId = entity.organizationId;
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
  private toCustomRecord(
    entity: CustomMcpIntegration,
  ): CustomMcpIntegrationRecord {
    const record = new CustomMcpIntegrationRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.organizationId = entity.organizationId;
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
