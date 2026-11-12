import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { RecordingSummaryModelsRepository } from 'src/domain/models/application/ports/recording-summary-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { RecordingSummaryModelRecord } from './schema/recording-summary-model.record';

@Injectable()
export class LocalRecordingSummaryModelsRepository extends RecordingSummaryModelsRepository {
  constructor(
    @InjectRepository(RecordingSummaryModelRecord)
    private readonly defaultRepository: Repository<RecordingSummaryModelRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<RecordingSummaryModelRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(RecordingSummaryModelRecord) ??
      this.defaultRepository
    );
  }

  async find(orgId: UUID): Promise<PermittedLanguageModel | null> {
    const record = await this.repository.findOne({
      where: { orgId },
      relations: { permittedModel: { model: true } },
    });
    if (!record?.permittedModel) return null;
    const permittedModel = this.permittedModelMapper.toDomain(
      record.permittedModel,
    );
    return permittedModel instanceof PermittedLanguageModel
      ? permittedModel
      : null;
  }

  /** One statement: concurrent writes for one org cannot collide. */
  async set(orgId: UUID, permittedModelId: UUID): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({
        id: randomUUID(),
        orgId,
        permittedModelId,
        updatedAt: new Date(),
      })
      .orUpdate(['permittedModelId', 'updatedAt'], ['orgId'])
      .execute();
  }

  async clear(orgId: UUID): Promise<void> {
    await this.repository.delete({ orgId });
  }
}
