import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { In, type Repository } from 'typeorm';
import {
  McpOAuthUserTokenRepositoryPort,
  type LockedMcpOAuthTokenOperation,
} from 'src/domain/mcp/application/ports/mcp-oauth-user-token.repository.port';
import type { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';
import { McpOAuthUserTokenMapper } from './mappers/mcp-oauth-user-token.mapper';
import { McpOAuthUserTokenRecord } from './schema/mcp-oauth-user-token.record';

@Injectable()
export class McpOAuthUserTokenRepository extends McpOAuthUserTokenRepositoryPort {
  constructor(
    @InjectRepository(McpOAuthUserTokenRecord)
    private readonly repository: Repository<McpOAuthUserTokenRecord>,
  ) {
    super();
  }

  async findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<McpOAuthUserToken | null> {
    const record = await this.repository.findOne({
      where: { integrationId, userId },
    });
    return record ? McpOAuthUserTokenMapper.toDomain(record) : null;
  }

  async findByIntegrationIdsAndUser(
    integrationIds: UUID[],
    userId: UUID,
  ): Promise<McpOAuthUserToken[]> {
    if (integrationIds.length === 0) return [];
    const records = await this.repository.find({
      where: { integrationId: In(integrationIds), userId },
    });
    return records.map((record) => McpOAuthUserTokenMapper.toDomain(record));
  }

  async save(token: McpOAuthUserToken): Promise<McpOAuthUserToken> {
    const saved = await this.repository.save(
      McpOAuthUserTokenMapper.toRecord(token),
    );
    return McpOAuthUserTokenMapper.toDomain(saved);
  }

  async saveIfCurrent(
    token: McpOAuthUserToken,
    grantRevision: UUID,
  ): Promise<boolean> {
    const result = await this.repository.update(
      {
        integrationId: token.integrationId,
        userId: token.userId,
        grantRevision,
      },
      {
        issuer: token.issuer,
        encryptedAccessToken: token.encryptedAccessToken,
        encryptedRefreshToken: token.encryptedRefreshToken,
        expiresAt: token.expiresAt,
        tokenType: token.tokenType,
        scopes: [...token.scopes],
      },
    );
    return result.affected === 1;
  }

  async withLockedToken<T>(
    integrationId: UUID,
    userId: UUID,
    operation: LockedMcpOAuthTokenOperation<T>,
  ): Promise<T> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(McpOAuthUserTokenRecord);
      const record = await repository.findOne({
        where: { integrationId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      const current = record ? McpOAuthUserTokenMapper.toDomain(record) : null;
      const save = async (token: McpOAuthUserToken) =>
        McpOAuthUserTokenMapper.toDomain(
          await repository.save(McpOAuthUserTokenMapper.toRecord(token)),
        );
      const deleteLocked = async () => {
        await repository.delete({ integrationId, userId });
      };
      return operation(current, save, deleteLocked);
    });
  }

  async delete(integrationId: UUID, userId: UUID): Promise<void> {
    await this.repository.delete({ integrationId, userId });
  }

  async deleteByIntegration(integrationId: UUID): Promise<void> {
    await this.repository.delete({ integrationId });
  }
}
