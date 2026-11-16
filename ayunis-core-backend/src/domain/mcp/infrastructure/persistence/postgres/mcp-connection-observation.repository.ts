import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID, type UUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { McpConnectionObservationRepositoryPort } from 'src/domain/mcp/application/ports/mcp-connection-observation.repository.port';
import type { McpConnectionObservation } from 'src/domain/mcp/domain/mcp-connection-observation';
import { McpConnectionObservationRecord } from './schema/mcp-connection-observation.record';

@Injectable()
export class McpConnectionObservationRepository extends McpConnectionObservationRepositoryPort {
  constructor(
    @InjectRepository(McpConnectionObservationRecord)
    private readonly repository: Repository<McpConnectionObservationRecord>,
  ) {
    super();
  }

  async record(observation: McpConnectionObservation): Promise<void> {
    // An earlier request finishing late must not overwrite a newer observation.
    await this.repository
      .createQueryBuilder('observation')
      .insert()
      .values({ id: randomUUID(), ...observation })
      .orUpdate(
        ['revision', 'startedAt', 'checkedAt', 'failure'],
        ['integration_id', 'user_id'],
        {
          overwriteCondition: {
            where: '"observation"."startedAt" <= EXCLUDED."startedAt"',
          },
        },
      )
      .execute();
  }

  async findForUser(
    integrationIds: UUID[],
    userId: UUID,
  ): Promise<McpConnectionObservation[]> {
    if (!integrationIds.length) return [];
    return this.repository.find({
      where: { integrationId: In(integrationIds), userId },
    });
  }
}
