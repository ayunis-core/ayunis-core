import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { In, type Repository } from 'typeorm';
import { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import { McpToolAllowanceRecord } from './schema/mcp-tool-allowance.record';

@Injectable()
export class McpToolAllowanceRepository extends McpToolAllowanceRepositoryPort {
  private readonly logger = new Logger(McpToolAllowanceRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<McpToolAllowanceRecord> {
    return this.txHost.tx.getRepository(McpToolAllowanceRecord);
  }

  async saveIfAbsent(allowance: McpToolAllowance): Promise<void> {
    this.logger.log(
      {
        userId: allowance.userId,
        integrationId: allowance.integrationId,
        toolName: allowance.toolName,
      },
      'saveIfAbsent',
    );

    // ON CONFLICT DO NOTHING keeps concurrent confirmations of the same tool
    // from failing on the unique key.
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({
        id: allowance.id,
        userId: allowance.userId,
        integrationId: allowance.integrationId,
        toolName: allowance.toolName,
        createdAt: allowance.createdAt,
        updatedAt: allowance.createdAt,
      })
      .orIgnore()
      .execute();
  }

  async findByUser(userId: UUID): Promise<McpToolAllowance[]> {
    this.logger.log({ userId }, 'findByUser');

    const records = await this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByUserAndIntegrationIds(
    userId: UUID,
    integrationIds: UUID[],
  ): Promise<McpToolAllowance[]> {
    this.logger.log(
      { userId, count: integrationIds.length },
      'findByUserAndIntegrationIds',
    );

    if (integrationIds.length === 0) {
      return [];
    }

    const records = await this.repository.find({
      where: { userId, integrationId: In(integrationIds) },
    });
    return records.map((record) => this.toDomain(record));
  }

  async deleteByIdAndUser(id: UUID, userId: UUID): Promise<boolean> {
    this.logger.log({ id, userId }, 'deleteByIdAndUser');

    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  private toDomain(record: McpToolAllowanceRecord): McpToolAllowance {
    return new McpToolAllowance({
      id: record.id,
      userId: record.userId,
      integrationId: record.integrationId,
      toolName: record.toolName,
      createdAt: record.createdAt,
    });
  }
}
