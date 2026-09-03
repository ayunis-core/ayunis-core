import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import {
  SourceRepository,
  type WorkspaceSourceListOptions,
} from 'src/domain/sources/application/ports/source.repository';
import { SourceMapper } from './mappers/source.mapper';
import { TextSourceDetailsRecord } from './schema/text-source-details.record';
import {
  DataSourceRecord,
  SourceRecord,
  TextSourceRecord,
} from './schema/source.record';
import {
  CSVDataSourceDetailsRecord,
  DataSourceDetailsRecord,
} from './schema/data-source-details.record';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class LocalSourceRepository extends SourceRepository {
  private readonly logger = new Logger(LocalSourceRepository.name);

  constructor(
    @InjectRepository(SourceRecord)
    private readonly defaultSourceRepository: Repository<SourceRecord>,
    private readonly mapper: SourceMapper,
    private readonly chunkMapper: SourceContentChunkMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private getManager(): EntityManager {
    // Scheduled and background callers can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultSourceRepository.manager;
  }

  private get sourceRepository(): Repository<SourceRecord> {
    return this.getManager().getRepository(SourceRecord);
  }

  private get textSourceDetailsRepository(): Repository<TextSourceDetailsRecord> {
    return this.getManager().getRepository(TextSourceDetailsRecord);
  }

  private get dataSourceDetailsRepository(): Repository<DataSourceDetailsRecord> {
    return this.getManager().getRepository(DataSourceDetailsRecord);
  }

  private get sourceContentChunkRepository(): Repository<SourceContentChunkRecord> {
    return this.getManager().getRepository(SourceContentChunkRecord);
  }

  async findById(id: UUID): Promise<TextSource | DataSource | null> {
    this.logger.log({ id }, 'findById');
    const record = await this.sourceRepository.findOne({
      where: { id },
    });
    if (!record) {
      return null;
    }
    if (record instanceof TextSourceRecord) {
      // Processing sources don't have details yet — the async pipeline
      // creates them. Skip the check so the consumer can load the source.
      if (record.status !== SourceStatus.PROCESSING) {
        // Only check that the details row exists — never load the `text`
        // column, which can be very large, into application memory.
        const detailsExist = await this.textSourceDetailsRepository.exists({
          where: { source: { id } },
        });
        if (!detailsExist) {
          return null;
        }
      }
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
    this.logger.log({ count: ids.length }, 'findByIds');
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

  async findPaginatedByWorkspaceId(
    options: WorkspaceSourceListOptions,
  ): Promise<Paginated<Source>> {
    this.logger.log(
      {
        workspaceId: options.workspaceId,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      },
      'findPaginatedByWorkspaceId',
    );

    const queryBuilder = this.sourceRepository
      .createQueryBuilder('source')
      .leftJoinAndSelect(
        'source.dataSourceDetails',
        'dataSourceDetails',
        'source.type = :dataType',
        { dataType: 'data' },
      )
      .where(
        `EXISTS (
          SELECT 1
          FROM workspace_source_assignments assignment
          WHERE assignment."workspaceId" = :workspaceId
            AND assignment."sourceId" = source.id
        )`,
        { workspaceId: options.workspaceId },
      );

    if (options.search) {
      queryBuilder.andWhere('source.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    const [records, total] = await queryBuilder
      .addSelect('LOWER(source.name)', 'lower_source_name')
      .orderBy('lower_source_name', 'ASC')
      .addOrderBy('source.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) => this.mapper.toDomain(record)),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }

  async findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]> {
    this.logger.log({ knowledgeBaseId }, 'findByKnowledgeBaseId');
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
    this.logger.log({ sourceId: source.id }, 'saveTextSource');
    const {
      source: sourceRecord,
      details,
      contentChunks,
    } = this.mapper.toTextSourceRecord(source, content);
    this.logger.debug(
      {
        sourceId: sourceRecord.id,
        chunksCount: contentChunks.length,
      },
      'Saving text source record',
    );
    const savedSource = await this.sourceRepository.save(sourceRecord);
    this.logger.debug({ id: savedSource.id }, 'Saved source record with id');
    const savedDetails = await this.textSourceDetailsRepository.save(details);
    const savedContentChunks =
      await this.sourceContentChunkRepository.save(contentChunks);
    savedSource.textSourceDetails = savedDetails;
    savedDetails.contentChunks = savedContentChunks;
    return this.mapper.toDomain(savedSource);
  }

  async findStaleProcessingSourceIds(
    staleBefore: Date,
    limit: number,
  ): Promise<UUID[]> {
    this.logger.log({ staleBefore, limit }, 'findStaleProcessingSourceIds');
    const records = await this.sourceRepository.find({
      select: { id: true },
      where: {
        status: SourceStatus.PROCESSING,
        processingStartedAt: LessThan(staleBefore),
      },
      order: { processingStartedAt: 'ASC' },
      take: limit,
    });
    return records.map((record) => record.id);
  }

  async save(source: TextSource): Promise<TextSource>;
  async save(source: DataSource): Promise<DataSource>;
  async save(source: Source): Promise<Source>;
  async save(source: Source): Promise<Source> {
    this.logger.log({ sourceId: source.id }, 'save');
    if (source instanceof TextSource) {
      const { source: sourceRecord } = this.mapper.toRecord(source);
      const savedSource = await this.sourceRepository.save(sourceRecord);
      this.logger.debug({ id: savedSource.id }, 'Saved source record with id');
      return this.mapper.toDomain(savedSource as TextSourceRecord);
    }
    if (source instanceof DataSource) {
      const { source: sourceRecord, details } = this.mapper.toRecord(source);
      sourceRecord.dataSourceDetails = details;
      const savedSource = await this.sourceRepository.save(sourceRecord);
      this.logger.debug({ id: savedSource.id }, 'Saved source record with id');
      const savedDetails = await this.dataSourceDetailsRepository.save(details);
      savedSource.dataSourceDetails = savedDetails;
      return this.mapper.toDomain(savedSource);
    }
    throw new Error('Unsupported source type');
  }

  async updateStatusConditionally(
    sourceId: UUID,
    fromStatus: SourceStatus,
    toStatus: SourceStatus,
    updates?: Partial<{ processingError: string | null }>,
  ): Promise<boolean> {
    this.logger.log(
      {
        sourceId,
        fromStatus,
        toStatus,
      },
      'updateStatusConditionally',
    );
    const qb = this.sourceRepository
      .createQueryBuilder()
      .update()
      .set({
        status: toStatus,
        ...(updates?.processingError !== undefined
          ? { processingError: updates.processingError }
          : {}),
      })
      .where('id = :id AND status = :fromStatus', {
        id: sourceId,
        fromStatus,
      });
    const result = await qb.execute();
    return (result.affected ?? 0) > 0;
  }

  async refreshProcessingHeartbeat(sourceId: UUID): Promise<boolean> {
    const result = await this.sourceRepository
      .createQueryBuilder()
      .update()
      .set({ processingStartedAt: () => 'now()' })
      .where('id = :id AND status = :status', {
        id: sourceId,
        status: SourceStatus.PROCESSING,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async updateCsvSourceData(
    sourceId: UUID,
    data: { headers: string[]; rows: string[][] },
  ): Promise<boolean> {
    const result = await this.dataSourceDetailsRepository
      .createQueryBuilder()
      .update(CSVDataSourceDetailsRecord)
      .set({ data })
      .where('"sourceId" = :id', { id: sourceId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async extractTextLines(
    sourceId: UUID,
    startLine: number,
    endLine: number,
  ): Promise<{ totalLines: number; text: string } | null> {
    this.logger.log({ sourceId, startLine, endLine }, 'extractTextLines');
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
    this.logger.log({ count: chunkIds.length }, 'findContentChunksByIds');
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
    this.logger.log({ sourceId }, 'delete');
    await this.sourceRepository.delete({ id: sourceId });
  }

  async deleteMany(sourceIds: UUID[]): Promise<void> {
    this.logger.log({ count: sourceIds.length }, 'deleteMany');
    if (sourceIds.length === 0) {
      return;
    }
    await this.sourceRepository.delete(sourceIds);
  }

  async findUnreferencedIds(
    candidateIds: UUID[],
    olderThan: Date,
  ): Promise<UUID[]> {
    this.logger.log(
      {
        candidateCount: candidateIds.length,
        olderThan,
      },
      'findUnreferencedIds',
    );

    if (candidateIds.length === 0) {
      return [];
    }

    const rows = await this.sourceRepository
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .where('s.id IN (:...candidateIds)', { candidateIds })
      .andWhere('s."knowledgeBaseId" IS NULL')
      .andWhere('s."createdAt" < :olderThan', { olderThan })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM skill_sources ss WHERE ss."sourcesId" = s.id)`,
      )
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM agent_source_assignments asa WHERE asa."sourceId" = s.id)`,
      )
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM workspace_source_assignments wsa WHERE wsa."sourceId" = s.id)`,
      )
      .getRawMany<{ id: UUID }>();

    return rows.map((row) => row.id);
  }
}
