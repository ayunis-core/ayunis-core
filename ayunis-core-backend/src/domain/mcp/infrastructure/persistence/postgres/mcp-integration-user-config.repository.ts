import { normalizeIntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, type Repository } from 'typeorm';
import { isDeepStrictEqual } from 'node:util';
import type { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { UUID } from 'crypto';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { McpIntegrationUserConfigRecord } from './schema/mcp-integration-user-config.record';

/**
 * PostgreSQL implementation of the MCP integration user config repository.
 * Handles persistence of per-user configuration for schema-configured integrations.
 */
@Injectable()
export class McpIntegrationUserConfigRepository extends McpIntegrationUserConfigRepositoryPort {
  private readonly logger = new Logger(McpIntegrationUserConfigRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<McpIntegrationUserConfigRecord> {
    return this.txHost.tx.getRepository(McpIntegrationUserConfigRecord);
  }

  async save(
    config: McpIntegrationUserConfig,
  ): Promise<McpIntegrationUserConfig> {
    this.logger.log(
      {
        configId: config.id,
        integrationId: config.integrationId,
        userId: config.userId,
      },
      'save',
    );

    const record = this.toRecord(config);
    const saved = await this.repository.save(record);
    return this.toDomain(saved);
  }

  async saveVerified(
    config: McpIntegrationUserConfig,
    expectedIntegration: SchemaConfiguredMcpIntegration,
    expectedConfig: McpIntegrationUserConfig | null,
  ): Promise<boolean> {
    return this.txHost.withTransaction(async () => {
      // Lock only during the recheck/write, never during the remote request.
      const integration = await this.txHost.tx
        .getRepository(McpIntegrationRecord)
        .findOne({
          where: { id: config.integrationId, orgId: expectedIntegration.orgId },
          loadEagerRelations: false,
          lock: { mode: 'pessimistic_write' },
        });
      if (
        !integration ||
        !this.matchesIntegration(integration, expectedIntegration)
      )
        return false;
      const current = await this.findByIntegrationAndUser(
        config.integrationId,
        config.userId,
      );
      if (!this.matchesConfig(current, expectedConfig)) return false;
      const record = this.toRecord(config);
      if (!current) {
        await this.repository.insert(record);
        return true;
      }
      const result = await this.repository.update(
        {
          id: current.id,
          userId: config.userId,
          integrationId: config.integrationId,
        },
        { configValues: record.configValues, updatedAt: record.updatedAt },
      );
      return result.affected === 1;
    });
  }

  private matchesIntegration(
    record: McpIntegrationRecord,
    expected: SchemaConfiguredMcpIntegration,
  ): boolean {
    if (!record.configSchema) return false;
    return (
      record.serverUrl === expected.serverUrl &&
      record.enabled === expected.enabled &&
      record.updatedAt.getTime() === expected.updatedAt.getTime() &&
      isDeepStrictEqual(
        normalizeIntegrationConfigSchema(record.configSchema),
        expected.configSchema,
      ) &&
      isDeepStrictEqual(record.orgConfigValues ?? {}, expected.orgConfigValues)
    );
  }

  private matchesConfig(
    current: McpIntegrationUserConfig | null,
    expected: McpIntegrationUserConfig | null,
  ): boolean {
    if (!current || !expected) return current === expected;
    return (
      current.id === expected.id &&
      current.updatedAt.getTime() === expected.updatedAt.getTime() &&
      isDeepStrictEqual(current.configValues, expected.configValues)
    );
  }

  async findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<McpIntegrationUserConfig | null> {
    this.logger.log({ integrationId, userId }, 'findByIntegrationAndUser');

    const record = await this.repository.findOne({
      where: { integrationId, userId },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findByIntegrationIdsAndUser(
    integrationIds: UUID[],
    userId: UUID,
  ): Promise<McpIntegrationUserConfig[]> {
    this.logger.log(
      {
        count: integrationIds.length,
        userId,
      },
      'findByIntegrationIdsAndUser',
    );

    if (integrationIds.length === 0) {
      return [];
    }

    const records = await this.repository.find({
      where: { integrationId: In(integrationIds), userId },
    });

    return records.map((record) => this.toDomain(record));
  }

  async deleteByIntegrationId(integrationId: UUID): Promise<void> {
    this.logger.log({ integrationId }, 'deleteByIntegrationId');

    await this.repository.delete({ integrationId });
  }

  async deleteByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<void> {
    await this.repository.delete({ integrationId, userId });
  }

  async removeKeysByIntegrationId(
    integrationId: UUID,
    keys: string[],
  ): Promise<void> {
    if (keys.length === 0) return;

    this.logger.log({ integrationId, keys }, 'removeKeysByIntegrationId');
    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        configValues: () => '"config_values" - :keys::text[]',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('"integration_id" = :integrationId', { integrationId })
      .setParameter('keys', keys)
      .execute();
  }

  private toRecord(
    entity: McpIntegrationUserConfig,
  ): McpIntegrationUserConfigRecord {
    const record = new McpIntegrationUserConfigRecord();
    record.id = entity.id;
    record.integrationId = entity.integrationId;
    record.userId = entity.userId;
    record.configValues = entity.configValues;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  private toDomain(
    record: McpIntegrationUserConfigRecord,
  ): McpIntegrationUserConfig {
    return new McpIntegrationUserConfig({
      id: record.id,
      integrationId: record.integrationId as UUID,
      userId: record.userId,
      configValues: record.configValues,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
