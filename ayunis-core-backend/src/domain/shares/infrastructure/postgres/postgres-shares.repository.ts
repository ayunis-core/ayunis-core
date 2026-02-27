import { Injectable } from '@nestjs/common';
import { SharesRepository } from '../../application/ports/shares-repository.port';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShareRecord } from './schema/share.record';
import { ShareMapper } from './mappers/share.mapper';
import { Share } from '../../domain/share.entity';
import { UUID } from 'crypto';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeRecord } from './schema/share-scope.record';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';

@Injectable()
export class PostgresSharesRepository extends SharesRepository {
  constructor(
    @InjectRepository(ShareRecord)
    private readonly shareRepository: Repository<ShareRecord>,
    @InjectRepository(ShareScopeRecord)
    private readonly shareScopeRepositry: Repository<ShareScopeRecord>,
    private readonly mapper: ShareMapper,
  ) {
    super();
  }

  async create(share: Share): Promise<void> {
    const record = this.mapper.toRecord(share);
    await this.shareScopeRepositry.save(record.scope);
    await this.shareRepository.save(record);
  }

  async findById(id: UUID): Promise<Share | null> {
    const record = await this.shareRepository.findOne({
      where: { id },
      relations: ['scope'],
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async delete(share: Share): Promise<void> {
    const record = await this.shareRepository.findOne({
      where: { id: share.id },
      relations: ['scope'],
    });
    if (!record) throw Error('Record not found');
    const scopeId = record.scope.id;
    await this.shareRepository.remove(record);
    await this.shareScopeRepositry.delete({ id: scopeId });
  }

  async findByEntityIdAndType(
    entityId: UUID,
    entityType: SharedEntityType,
  ): Promise<Share[]> {
    const entityColumn = this.getEntityColumn(entityType);

    const records = await this.shareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.scope', 'scope')
      .where(`${entityColumn} = :entityId`, { entityId })
      .orderBy('share.createdAt', 'DESC')
      .getMany();

    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByEntityTypeAndScope(
    entityType: SharedEntityType,
    scopeType: ShareScopeType,
    scopeId: UUID,
  ): Promise<Share[]> {
    let records: ShareRecord[] = [];

    if (scopeType === ShareScopeType.ORG) {
      records = await this.shareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.scope', 'scope')
        .where('share.entity_type = :entityType', { entityType })
        .andWhere('scope.scope_type = :scopeType', { scopeType })
        .andWhere('scope.orgId = :scopeId', { scopeId })
        .orderBy('share.createdAt', 'DESC')
        .getMany();
    } else if (scopeType === ShareScopeType.TEAM) {
      records = await this.shareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.scope', 'scope')
        .where('share.entity_type = :entityType', { entityType })
        .andWhere('scope.scope_type = :scopeType', { scopeType })
        .andWhere('scope.team_id = :scopeId', { scopeId })
        .orderBy('share.createdAt', 'DESC')
        .getMany();
    }

    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByEntityAndScope(
    entityType: SharedEntityType,
    entityId: UUID,
    scopeType: ShareScopeType,
    scopeId: UUID,
  ): Promise<Share | null> {
    let record: ShareRecord | null = null;

    const entityColumn = this.getEntityColumn(entityType);

    if (scopeType === ShareScopeType.ORG) {
      record = await this.shareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.scope', 'scope')
        .where('share.entity_type = :entityType', { entityType })
        .andWhere(`${entityColumn} = :entityId`, { entityId })
        .andWhere('scope.scope_type = :scopeType', { scopeType })
        .andWhere('scope.orgId = :scopeId', { scopeId })
        .getOne();
    } else if (scopeType === ShareScopeType.TEAM) {
      record = await this.shareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.scope', 'scope')
        .where('share.entity_type = :entityType', { entityType })
        .andWhere(`${entityColumn} = :entityId`, { entityId })
        .andWhere('scope.scope_type = :scopeType', { scopeType })
        .andWhere('scope.team_id = :scopeId', { scopeId })
        .getOne();
    }

    return record ? this.mapper.toDomain(record) : null;
  }

  async findByEntityTypeAndTeamIds(
    entityType: SharedEntityType,
    teamIds: UUID[],
  ): Promise<Share[]> {
    if (teamIds.length === 0) {
      return [];
    }

    let records: ShareRecord[] = [];

    records = await this.shareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.scope', 'scope')
      .where('share.entity_type = :entityType', { entityType })
      .andWhere('scope.scope_type = :scopeType', {
        scopeType: ShareScopeType.TEAM,
      })
      .andWhere('scope.team_id IN (:...teamIds)', { teamIds })
      .orderBy('share.createdAt', 'DESC')
      .getMany();

    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByTeamId(teamId: UUID): Promise<Share[]> {
    const records = await this.shareRepository
      .createQueryBuilder('share')
      .leftJoinAndSelect('share.scope', 'scope')
      .where('scope.scope_type = :scopeType', {
        scopeType: ShareScopeType.TEAM,
      })
      .andWhere('scope.team_id = :teamId', { teamId })
      .orderBy('share.createdAt', 'DESC')
      .getMany();

    return records.map((record) => this.mapper.toDomain(record));
  }

  private getEntityColumn(entityType: SharedEntityType): string {
    const entityColumnMap: Partial<Record<SharedEntityType, string>> = {
      [SharedEntityType.AGENT]: 'share.agent_id',
      [SharedEntityType.SKILL]: 'share.skill_id',
      [SharedEntityType.KNOWLEDGE_BASE]: 'share.knowledge_base_id',
    };
    const column = entityColumnMap[entityType];
    if (!column) {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }
    return column;
  }
}
