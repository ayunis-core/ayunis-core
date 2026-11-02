import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelModeEntryRecord } from './schema/model-mode-entry.record';
import { ModelModeEntryMapper } from './mappers/model-mode-entry.mapper';

@Injectable()
export class LocalModelModeEntriesRepository extends ModelModeEntriesRepository {
  constructor(
    @InjectRepository(ModelModeEntryRecord)
    private readonly defaultRepository: Repository<ModelModeEntryRecord>,
    private readonly mapper: ModelModeEntryMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<ModelModeEntryRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ModelModeEntryRecord) ?? this.defaultRepository
    );
  }

  async findByMode(mode: ModelMode): Promise<ModelModeEntry[]> {
    const records = await this.repository.find({
      where: { mode },
      relations: { model: true },
      order: { position: 'ASC' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async replaceForMode(
    mode: ModelMode,
    entries: ModelModeEntry[],
  ): Promise<void> {
    await this.repository.delete({ mode });
    if (entries.length > 0) {
      await this.repository.insert(entries.map((e) => this.mapper.toRecord(e)));
    }
  }
}
