import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { TextSource } from '../../../domain/sources/text-source.entity';
import { DataSource } from '../../../domain/sources/data-source.entity';
import { SourceRepository } from '../../../application/ports/source.repository';
import { SourceMapper } from './mappers/source.mapper';
import { TextSourceDetailsRecord } from './schema/text-source-details.record';
import {
  DataSourceRecord,
  SourceRecord,
  TextSourceRecord,
} from './schema/source.record';
import { DataSourceDetailsRecord } from './schema/data-source-details.record';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';

@Injectable()
export class LocalSourceRepository extends SourceRepository {
  private readonly logger = new Logger(LocalSourceRepository.name);

  constructor(
    @InjectRepository(SourceRecord)
    private readonly sourceRepository: Repository<SourceRecord>,
    @InjectRepository(TextSourceDetailsRecord)
    private readonly textSourceDetailsRepository: Repository<TextSourceDetailsRecord>,
    @InjectRepository(DataSourceDetailsRecord)
    private readonly dataSourceDetailsRepository: Repository<DataSourceDetailsRecord>,
    @InjectRepository(SourceContentChunkRecord)
    private readonly sourceContentChunkRepository: Repository<SourceContentChunkRecord>,
    private readonly mapper: SourceMapper,
  ) {
    super();
  }

  async findById(id: UUID): Promise<TextSource | DataSource | null> {
    this.logger.log('findById', { id });
    const record = await this.sourceRepository.findOne({
      where: { id },
    });
    if (!record) {
      return null;
    }
    if (record instanceof TextSourceRecord) {
      const textSourceDetails = await this.textSourceDetailsRepository.findOne({
        where: { source: { id } },
        relations: {
          contentChunks: true,
        },
      });
      if (!textSourceDetails) {
        return null;
      }
      record.textSourceDetails = textSourceDetails;
      const source = this.mapper.toDomain(record);
      return source;
    }
    if (record instanceof DataSourceRecord) {
      const dataSourceDetails = await this.dataSourceDetailsRepository.findOne({
        where: { source: { id } },
      });
      if (!dataSourceDetails) {
        return null;
      }
      record.dataSourceDetails = dataSourceDetails;
      const source = this.mapper.toDomain(record);
      return source;
    }

    return null;
  }

  async findByIds(ids: UUID[]): Promise<Source[]> {
    this.logger.log('findByIds', { count: ids.length });
    if (ids.length === 0) {
      return [];
    }
    const records = await this.sourceRepository.find({
      where: { id: In(ids) },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]> {
    this.logger.log('findByKnowledgeBaseId', { knowledgeBaseId });
    const records = await this.sourceRepository.find({
      where: { knowledgeBaseId },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async save(source: TextSource): Promise<TextSource>;
  async save(source: DataSource): Promise<DataSource>;
  async save(source: Source): Promise<Source>;
  async save(source: Source): Promise<Source> {
    this.logger.log('save', { sourceId: source.id });
    if (source instanceof TextSource) {
      const {
        source: sourceRecord,
        details,
        contentChunks,
      } = this.mapper.toRecord(source);
      this.logger.debug('Saving source record', {
        sourceId: sourceRecord.id,
        chunksCount: contentChunks.length,
      });
      const savedSource = await this.sourceRepository.save(sourceRecord);
      this.logger.debug('Saved source record with id', { id: savedSource.id });
      const savedDetails = await this.textSourceDetailsRepository.save(details);
      const savedContentChunks =
        await this.sourceContentChunkRepository.save(contentChunks);
      savedSource.textSourceDetails = savedDetails;
      savedDetails.contentChunks = savedContentChunks;
      return this.mapper.toDomain(savedSource);
    }
    if (source instanceof DataSource) {
      const { source: sourceRecord, details } = this.mapper.toRecord(source);
      sourceRecord.dataSourceDetails = details;
      const savedSource = await this.sourceRepository.save(sourceRecord);
      this.logger.debug('Saved source record with id', { id: savedSource.id });
      const savedDetails = await this.dataSourceDetailsRepository.save(details);
      savedSource.dataSourceDetails = savedDetails;
      return this.mapper.toDomain(savedSource);
    }
    throw new Error('Invalid source type');
  }

  async delete(source: Source): Promise<void> {
    this.logger.log('delete', { sourceId: source.id });
    const { source: record } = this.mapper.toRecord(source);
    await this.sourceRepository.remove(record);
  }

  async deleteMany(sourceIds: UUID[]): Promise<void> {
    this.logger.log('deleteMany', { count: sourceIds.length });
    if (sourceIds.length === 0) {
      return;
    }
    await this.sourceRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids)', { ids: sourceIds })
      .execute();
  }
}
