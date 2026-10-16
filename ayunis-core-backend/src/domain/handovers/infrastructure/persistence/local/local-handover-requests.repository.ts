import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverAlreadyPendingError } from 'src/domain/handovers/application/handovers.errors';
import type { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import { HandoverRequestMapper } from './mappers/handover-request.mapper';
import { HandoverRequestRecord } from './schema/handover-request.record';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  return (driverError?.code ?? record.code) === PG_UNIQUE_VIOLATION;
}

@Injectable()
export class LocalHandoverRequestsRepository extends HandoverRequestsRepository {
  constructor(
    @InjectRepository(HandoverRequestRecord)
    private readonly defaultRepository: Repository<HandoverRequestRecord>,
    private readonly mapper: HandoverRequestMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<HandoverRequestRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(HandoverRequestRecord) ?? this.defaultRepository
    );
  }

  async create(request: HandoverRequest): Promise<HandoverRequest> {
    try {
      const saved = await this.repository.save(this.mapper.toRecord(request));
      return this.mapper.toDomain(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HandoverAlreadyPendingError(request.resourceId);
      }
      throw error;
    }
  }

  async findViewById(id: UUID): Promise<HandoverRequestView | null> {
    const record = await this.viewQuery()
      .where('request.id = :id', { id })
      .getOne();
    return record ? this.mapper.toView(record) : null;
  }

  async findPendingForResource(
    resourceType: HandoverResourceType,
    resourceId: UUID,
  ): Promise<HandoverRequestView | null> {
    const column =
      resourceType === HandoverResourceType.SKILL
        ? 'skillId'
        : 'knowledgeBaseId';
    const record = await this.pendingQuery()
      .andWhere(`request.${column} = :resourceId`, { resourceId })
      .getOne();
    return record ? this.mapper.toView(record) : null;
  }

  async findPendingInOrg(
    orgId: UUID,
    resourceType?: HandoverResourceType,
  ): Promise<HandoverRequestView[]> {
    const query = this.pendingQuery()
      .andWhere('request.orgId = :orgId', { orgId })
      .orderBy('request.createdAt', 'ASC');
    if (resourceType) {
      query.andWhere('request.resourceType = :resourceType', { resourceType });
    }
    const records = await query.getMany();
    return records.map((record) => this.mapper.toView(record));
  }

  async decide(
    id: UUID,
    status: HandoverStatus,
    decidedByUserId: UUID,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(HandoverRequestRecord)
      .set({ status, decidedAt: new Date(), decidedByUserId })
      .where('id = :id AND status = :pending', {
        id,
        pending: HandoverStatus.PENDING,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private viewQuery(): SelectQueryBuilder<HandoverRequestRecord> {
    return this.repository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.skill', 'skill')
      .leftJoinAndSelect('request.knowledgeBase', 'knowledgeBase')
      .leftJoinAndSelect('request.requestedBy', 'requestedBy')
      .leftJoinAndSelect('request.targetTeam', 'targetTeam');
  }

  private pendingQuery(): SelectQueryBuilder<HandoverRequestRecord> {
    return this.viewQuery().where('request.status = :pending', {
      pending: HandoverStatus.PENDING,
    });
  }
}
