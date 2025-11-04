import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from '../../../application/ports/mcp-integrations.repository.port';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
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

  async findAll(
    orgId: UUID,
    filter?: { enabled?: boolean },
  ): Promise<McpIntegration[]> {
    this.logger.log('findAll', { orgId, filter });

    const where: { orgId: UUID; enabled?: boolean } = { orgId };
    if (filter?.enabled !== undefined) {
      where.enabled = filter.enabled;
    }

    const records = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async findByOrgIdAndSlug(
    organizationId: UUID,
    slug: PredefinedMcpIntegrationSlug,
  ): Promise<McpIntegration | null> {
    this.logger.log('findByOrgIdAndSlug', { organizationId, slug });

    const record = await this.repository.findOne({
      where: {
        orgId: organizationId,
        predefinedSlug: slug,
      },
    });

    if (!record) {
      return null;
    }

    return this.mcpIntegrationMapper.toDomain(record);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.repository.delete({ id });
  }
}
