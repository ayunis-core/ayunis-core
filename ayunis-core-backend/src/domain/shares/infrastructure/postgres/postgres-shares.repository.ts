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

  async delete(id: UUID, ownerId: UUID): Promise<void> {
    const record = await this.shareRepository.findOneBy({ id, ownerId });
    if (!record) throw Error('Record not found');
    const scopeId = record.scope.id;
    await this.shareRepository.remove(record);
    await this.shareScopeRepositry.delete({ id: scopeId });
  }

  async findByEntityIdAndType(
    entityId: UUID,
    entityType: SharedEntityType,
  ): Promise<Share[]> {
    let records: ShareRecord[] = [];

    // Query directly by the entity-specific field without using entityType
    if (entityType === SharedEntityType.AGENT) {
      // For agent shares, query by agentId directly
      // TypeORM will automatically filter to AgentShareRecord instances
      records = await this.shareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.scope', 'scope')
        .where('share.agent_id = :entityId', { entityId })
        .orderBy('share.createdAt', 'DESC')
        .getMany();
    }
    // Future: Add other entity types here
    // if (entityType === SharedEntityType.PROMPT) {
    //   records = await this.shareRepository
    //     .createQueryBuilder('share')
    //     .leftJoinAndSelect('share.scope', 'scope')
    //     .where('share.prompt_id = :entityId', { entityId })
    //     .orderBy('share.createdAt', 'DESC')
    //     .getMany();
    // }

    return records.map((record) => this.mapper.toDomain(record));
  }
}
