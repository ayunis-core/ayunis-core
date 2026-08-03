import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { IsNull, type Repository } from 'typeorm';
import { McpOAuthPendingSessionRepositoryPort } from '../../../application/ports/mcp-oauth-pending-session.repository.port';
import type { McpOAuthPendingSession } from '../../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthPendingSessionMapper } from './mappers/mcp-oauth-pending-session.mapper';
import { McpOAuthPendingSessionRecord } from './schema/mcp-oauth-pending-session.record';

@Injectable()
export class McpOAuthPendingSessionRepository extends McpOAuthPendingSessionRepositoryPort {
  constructor(
    @InjectRepository(McpOAuthPendingSessionRecord)
    private readonly repository: Repository<McpOAuthPendingSessionRecord>,
  ) {
    super();
  }

  async save(session: McpOAuthPendingSession): Promise<McpOAuthPendingSession> {
    const saved = await this.repository.save(
      McpOAuthPendingSessionMapper.toRecord(session),
    );
    return McpOAuthPendingSessionMapper.toDomain(saved);
  }

  async consumeByStateHash(
    stateHash: string,
    consumedAt: Date,
  ): Promise<McpOAuthPendingSession | null> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(McpOAuthPendingSessionRecord);
      const record = await repository.findOne({
        where: { stateHash, consumedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) return null;
      record.consumedAt = consumedAt;
      return McpOAuthPendingSessionMapper.toDomain(
        await repository.save(record),
      );
    });
  }

  async deleteByIntegration(integrationId: UUID): Promise<void> {
    await this.repository.delete({ integrationId });
  }
}
