import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { McpIntegrationUserConfigRepositoryPort } from '../../../application/ports/mcp-integration-user-config.repository.port';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { McpIntegrationUserConfigRecord } from './schema/mcp-integration-user-config.record';

/**
 * PostgreSQL implementation of the MCP integration user config repository.
 * Handles persistence of per-user configuration for marketplace integrations.
 */
@Injectable()
export class McpIntegrationUserConfigRepository extends McpIntegrationUserConfigRepositoryPort {
  private readonly logger = new Logger(McpIntegrationUserConfigRepository.name);

  constructor(
    @InjectRepository(McpIntegrationUserConfigRecord)
    private readonly repository: Repository<McpIntegrationUserConfigRecord>,
  ) {
    super();
  }

  async save(
    config: McpIntegrationUserConfig,
  ): Promise<McpIntegrationUserConfig> {
    this.logger.log('save', {
      configId: config.id,
      integrationId: config.integrationId,
      userId: config.userId,
    });

    const record = this.toRecord(config);
    const saved = await this.repository.save(record);
    return this.toDomain(saved);
  }

  async findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<McpIntegrationUserConfig | null> {
    this.logger.log('findByIntegrationAndUser', { integrationId, userId });

    const record = await this.repository.findOne({
      where: { integrationId, userId },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async deleteByIntegrationId(integrationId: UUID): Promise<void> {
    this.logger.log('deleteByIntegrationId', { integrationId });

    await this.repository.delete({ integrationId });
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
