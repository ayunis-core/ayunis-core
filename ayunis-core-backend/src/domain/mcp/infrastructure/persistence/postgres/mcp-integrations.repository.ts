import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from '../../../application/ports/mcp-integrations.repository.port';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { McpIntegrationMapper } from './mappers/mcp-integration.mapper';

/**
 * PostgreSQL implementation of the MCP integrations repository.
 * Handles persistence of MCP integrations using TypeORM and single-table inheritance.
 */
@Injectable()
export class McpIntegrationsRepository extends McpIntegrationsRepositoryPort {
  private readonly logger = new Logger(McpIntegrationsRepository.name);

  constructor(
    @InjectRepository(McpIntegrationRecord)
    private readonly repository: Repository<McpIntegrationRecord>,
    private readonly mcpIntegrationMapper: McpIntegrationMapper,
  ) {
    super();
  }

  async save(integration: McpIntegration): Promise<McpIntegration> {
    this.logger.log('save', { integrationId: integration.id });

    const record = this.mcpIntegrationMapper.toRecord(integration);
    const savedRecord = await this.repository.save(record);

    // Reload to ensure we have the complete record with all relations
    const reloadedRecord = await this.repository.findOne({
      where: { id: savedRecord.id },
    });

    if (!reloadedRecord) {
      throw new Error(
        `Failed to reload saved MCP integration with ID ${savedRecord.id}`,
      );
    }

    return this.mcpIntegrationMapper.toDomain(reloadedRecord);
  }

  async findById(id: UUID): Promise<McpIntegration | null> {
    this.logger.log('findById', { id });

    const record = await this.repository.findOne({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mcpIntegrationMapper.toDomain(record);
  }

  async findByIds(ids: UUID[]): Promise<McpIntegration[]> {
    this.logger.log('findByIds', { count: ids.length });

    if (ids.length === 0) {
      return [];
    }

    const records = await this.repository.find({
      where: { id: In(ids) },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async findAll(): Promise<McpIntegration[]> {
    this.logger.log('findAll');

    const records = await this.repository.find({
      order: { createdAt: 'DESC' },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async findByOrganizationId(organizationId: UUID): Promise<McpIntegration[]> {
    this.logger.log('findByOrganizationId', { organizationId });

    const records = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async findByOrganizationIdAndEnabled(
    organizationId: UUID,
  ): Promise<McpIntegration[]> {
    this.logger.log('findByOrganizationIdAndEnabled', { organizationId });

    const records = await this.repository.find({
      where: {
        organizationId,
        enabled: true,
      },
      order: { createdAt: 'DESC' },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.repository.delete({ id });
  }
}
