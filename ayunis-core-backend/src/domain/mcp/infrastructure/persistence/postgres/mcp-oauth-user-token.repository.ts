import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import {
  McpOAuthUserTokenRepositoryPort,
  type LockedMcpOAuthTokenOperation,
} from '../../../application/ports/mcp-oauth-user-token.repository.port';
import type { McpOAuthUserToken } from '../../../domain/mcp-oauth-user-token.entity';
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

  async save(token: McpOAuthUserToken): Promise<McpOAuthUserToken> {
    const saved = await this.repository.save(
      McpOAuthUserTokenMapper.toRecord(token),
    );
    return McpOAuthUserTokenMapper.toDomain(saved);
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
