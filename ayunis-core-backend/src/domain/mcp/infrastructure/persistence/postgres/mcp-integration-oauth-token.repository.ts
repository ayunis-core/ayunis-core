import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { McpIntegrationOAuthTokenRepositoryPort } from '../../../application/ports/mcp-integration-oauth-token.repository.port';
import { McpIntegrationOAuthToken } from '../../../domain/mcp-integration-oauth-token.entity';
import { McpIntegrationOAuthTokenRecord } from './schema/mcp-integration-oauth-token.record';

/**
 * PostgreSQL implementation of {@link McpIntegrationOAuthTokenRepositoryPort}.
 *
 * Handles persistence of OAuth tokens scoped to an MCP integration and
 * optionally a user. For org-level tokens (`userId === null`), queries
 * use `IS NULL` rather than equality to match the partial unique index.
 */
@Injectable()
export class McpIntegrationOAuthTokenRepository extends McpIntegrationOAuthTokenRepositoryPort {
  private readonly logger = new Logger(McpIntegrationOAuthTokenRepository.name);

  constructor(
    @InjectRepository(McpIntegrationOAuthTokenRecord)
    private readonly repository: Repository<McpIntegrationOAuthTokenRecord>,
  ) {
    super();
  }

  async findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID | null,
  ): Promise<McpIntegrationOAuthToken | null> {
    this.logger.log('findByIntegrationAndUser', { integrationId, userId });

    const record = await this.repository.findOne({
      where: {
        integrationId,
        userId: userId ?? IsNull(),
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async save(
    token: McpIntegrationOAuthToken,
  ): Promise<McpIntegrationOAuthToken> {
    this.logger.log('save', {
      tokenId: token.id,
      integrationId: token.integrationId,
      userId: token.userId,
    });

    const record = this.toRecord(token);
    const saved = await this.repository.save(record);
    return this.toDomain(saved);
  }

  async deleteByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID | null,
  ): Promise<void> {
    this.logger.log('deleteByIntegrationAndUser', { integrationId, userId });

    await this.repository
      .createQueryBuilder()
      .delete()
      .where('integration_id = :integrationId', { integrationId })
      .andWhere(
        userId === null ? 'user_id IS NULL' : 'user_id = :userId',
        userId === null ? {} : { userId },
      )
      .execute();
  }

  async deleteAllByIntegration(integrationId: UUID): Promise<void> {
    this.logger.log('deleteAllByIntegration', { integrationId });

    await this.repository.delete({ integrationId });
  }

  private toRecord(
    entity: McpIntegrationOAuthToken,
  ): McpIntegrationOAuthTokenRecord {
    const record = new McpIntegrationOAuthTokenRecord();
    record.id = entity.id;
    record.integrationId = entity.integrationId;
    record.userId = entity.userId;
    record.accessTokenEncrypted = entity.accessTokenEncrypted;
    record.refreshTokenEncrypted = entity.refreshTokenEncrypted ?? null;
    record.tokenExpiresAt = entity.tokenExpiresAt ?? null;
    record.scope = entity.scope ?? null;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  private toDomain(
    record: McpIntegrationOAuthTokenRecord,
  ): McpIntegrationOAuthToken {
    return new McpIntegrationOAuthToken({
      id: record.id,
      integrationId: record.integrationId,
      userId: record.userId,
      accessTokenEncrypted: record.accessTokenEncrypted,
      refreshTokenEncrypted: record.refreshTokenEncrypted ?? undefined,
      tokenExpiresAt: record.tokenExpiresAt ?? undefined,
      scope: record.scope ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
