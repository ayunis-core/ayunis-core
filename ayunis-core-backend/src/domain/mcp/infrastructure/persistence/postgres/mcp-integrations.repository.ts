import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { McpIntegrationAuthRecord } from './schema/mcp-integration-auth.record';
import { PredefinedMcpIntegrationRecord } from './schema/predefined-mcp-integration.record';
import { MarketplaceMcpIntegrationRecord } from './schema/marketplace-mcp-integration.record';
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
    @InjectRepository(McpIntegrationAuthRecord)
    private readonly authRepository: Repository<McpIntegrationAuthRecord>,
    @InjectRepository(PredefinedMcpIntegrationRecord)
    private readonly predefinedRepository: Repository<PredefinedMcpIntegrationRecord>,
    @InjectRepository(MarketplaceMcpIntegrationRecord)
    private readonly marketplaceRepository: Repository<MarketplaceMcpIntegrationRecord>,
    private readonly mcpIntegrationMapper: McpIntegrationMapper,
  ) {
    super();
  }

  async save<T extends McpIntegration>(integration: T): Promise<T> {
    this.logger.log({ integrationId: integration.id }, 'save');

    const recordResult = this.mcpIntegrationMapper.toRecord(integration);
    if (recordResult instanceof Error) {
      throw recordResult;
    }
    const record: McpIntegrationRecord = recordResult;
    const authRecord = record.auth;

    await this.repository.manager.transaction(async (manager) => {
      const integrationRepo = manager.getRepository(McpIntegrationRecord);
      const authRepo = manager.getRepository(McpIntegrationAuthRecord);

      const recordWithOptionalAuth = record as McpIntegrationRecord & {
        auth?: McpIntegrationAuthRecord;
      };
      recordWithOptionalAuth.auth =
        undefined as unknown as McpIntegrationAuthRecord;

      await integrationRepo.save(record);

      authRecord.integration = record;
      authRecord.integrationId = record.id;

      await authRepo.save(authRecord);

      recordWithOptionalAuth.auth = authRecord;
    });

    // Reload to ensure we have the complete record with all relations
    const reloadedRecord = await this.repository.findOne({
      where: { id: record.id },
    });

    if (!reloadedRecord) {
      throw new Error(
        `Failed to reload saved MCP integration with ID ${record.id}`,
      );
    }

    return this.mcpIntegrationMapper.toDomain(reloadedRecord) as T;
  }

  async findById(id: UUID): Promise<McpIntegration | null> {
    this.logger.log({ id }, 'findById');

    const record = await this.repository.findOne({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mcpIntegrationMapper.toDomain(record);
  }

  async findByIds(ids: UUID[]): Promise<McpIntegration[]> {
    this.logger.log({ count: ids.length }, 'findByIds');

    if (ids.length === 0) {
      return [];
    }

    const records = await this.repository.find({
      where: { id: In(ids) },
    });

    return records.map((record) => this.mcpIntegrationMapper.toDomain(record));
  }

  async findAll(
    orgId: UUID,
    filter?: { enabled?: boolean },
  ): Promise<McpIntegration[]> {
    this.logger.log({ orgId, filter }, 'findAll');

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
    this.logger.log({ organizationId, slug }, 'findByOrgIdAndSlug');

    const record = await this.predefinedRepository.findOne({
      where: {
        orgId: organizationId,
        predefinedSlug: slug,
      },
      relations: {
        auth: true,
      },
    });

    if (!record) {
      return null;
    }

    return this.mcpIntegrationMapper.toDomain(record);
  }

  async findByOrgIdAndMarketplaceIdentifier(
    orgId: UUID,
    marketplaceIdentifier: string,
  ): Promise<McpIntegration | null> {
    this.logger.log(
      {
        orgId,
        marketplaceIdentifier,
      },
      'findByOrgIdAndMarketplaceIdentifier',
    );

    const record = await this.marketplaceRepository.findOne({
      where: {
        orgId,
        marketplaceIdentifier,
      },
      relations: {
        auth: true,
      },
    });

    if (!record) {
      return null;
    }

    return this.mcpIntegrationMapper.toDomain(record);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');

    await this.repository.delete({ id });
  }
}
