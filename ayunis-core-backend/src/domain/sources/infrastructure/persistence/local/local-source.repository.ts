import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

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
    private readonly chunkMapper: SourceContentChunkMapper,
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
      });
      if (!textSourceDetails) {
        return null;
      }
      record.textSourceDetails = textSourceDetails;
      return this.mapper.toDomain(record);
    }
    if (record instanceof DataSourceRecord) {
      const dataSourceDetails = await this.dataSourceDetailsRepository.findOne({
        where: { source: { id } },
      });
      if (!dataSourceDetails) {
        return null;
      }
      record.dataSourceDetails = dataSourceDetails;
      return this.mapper.toDomain(record);
    }

    return null;
  }

  async findByIds(ids: UUID[]): Promise<Source[]> {
    this.logger.log('findByIds', { count: ids.length });
    if (ids.length === 0) {
      return [];
    }
    const records = await this.sourceRepository
      .createQueryBuilder('source')
      .leftJoinAndSelect(
        'source.dataSourceDetails',
        'dataSourceDetails',
        'source.type = :dataType',
        { dataType: 'data' },
      )
      .where('source.id IN (:...ids)', { ids })
      .getMany();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]> {
    this.logger.log('findByKnowledgeBaseId', { knowledgeBaseId });
    const records = await this.sourceRepository
      .createQueryBuilder('source')
      .leftJoinAndSelect(
        'source.dataSourceDetails',
        'dataSourceDetails',
        'source.type = :dataType',
        { dataType: 'data' },
      )
      .where('source.knowledgeBaseId = :knowledgeBaseId', { knowledgeBaseId })
      .getMany();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async saveTextSource(
    source: TextSource,
    content: { text: string; chunks: TextSourceContentChunk[] },
  ): Promise<TextSource> {
    this.logger.log('saveTextSource', { sourceId: source.id });
    const {
      source: sourceRecord,
      details,
      contentChunks,
    } = this.mapper.toTextSourceRecord(source, content);
    this.logger.debug('Saving text source record', {
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
    return this.mapper.toDomain(savedSource as TextSourceRecord);
  }

  async save(source: DataSource): Promise<DataSource>;
  async save(source: Source): Promise<Source>;
  async save(source: Source): Promise<Source> {
    this.logger.log('save', { sourceId: source.id });
    if (source instanceof DataSource) {
      const { source: sourceRecord, details } = this.mapper.toRecord(source);
      sourceRecord.dataSourceDetails = details;
      const savedSource = await this.sourceRepository.save(sourceRecord);
      this.logger.debug('Saved source record with id', { id: savedSource.id });
      const savedDetails = await this.dataSourceDetailsRepository.save(details);
      savedSource.dataSourceDetails = savedDetails;
      return this.mapper.toDomain(savedSource);
    }
    throw new Error('Use saveTextSource for TextSource entities');
  }

  async extractTextLines(
    sourceId: UUID,
    startLine: number,
    endLine: number,
  ): Promise<{ totalLines: number; text: string } | null> {
    this.logger.log('extractTextLines', { sourceId, startLine, endLine });
    const result: { totalLines: string; text: string }[] =
      await this.textSourceDetailsRepository.query(
        `SELECT
          array_length(string_to_array(text, E'\\n'), 1) AS "totalLines",
          array_to_string(
            (string_to_array(text, E'\\n'))[$1:$2],
            E'\\n'
          ) AS "text"
        FROM text_source_details_record
        WHERE "sourceId" = $3`,
        [startLine, endLine, sourceId],
      );
    if (result.length === 0) {
      return null;
    }
    return {
      totalLines: parseInt(result[0].totalLines, 10),
      text: result[0].text,
    };
  }

  async findContentChunksByIds(
    chunkIds: UUID[],
  ): Promise<
    { chunk: TextSourceContentChunk; sourceId: UUID; sourceName: string }[]
  > {
    this.logger.log('findContentChunksByIds', { count: chunkIds.length });
    if (chunkIds.length === 0) {
      return [];
    }
    const records = await this.sourceContentChunkRepository
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.source', 'details')
      .innerJoin('details.source', 'source')
      .addSelect(['source.id', 'source.name'])
      .where('chunk.id IN (:...ids)', { ids: chunkIds })
      .getMany();

    return records.map((record) => ({
      chunk: this.chunkMapper.toDomain(record),
      sourceId: record.source.source.id,
      sourceName: record.source.source.name,
    }));
  }

  async delete(sourceId: UUID): Promise<void> {
    this.logger.log('delete', { sourceId });
    await this.sourceRepository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id: sourceId })
      .execute();
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
