import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { Source } from '../../../domain/source.entity';
import { FileSource } from '../../../domain/sources/file-source.entity';
import { UrlSource } from '../../../domain/sources/url-source.entity';
import { SourceRepository } from '../../../application/ports/source.repository';
import { SourceRecord } from './schema/source.record';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import { SourceMapper } from './mappers/source.mapper';
import { SourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

@Injectable()
export class LocalSourceRepository extends SourceRepository {
  private readonly logger = new Logger(LocalSourceRepository.name);

  constructor(
    @InjectRepository(SourceRecord)
    private readonly sourceRepository: Repository<SourceRecord>,
    @InjectRepository(SourceContentChunkRecord)
    private readonly sourceContentChunkRepository: Repository<SourceContentChunkRecord>,
    private readonly sourceMapper: SourceMapper,
    private readonly sourceContentChunkMapper: SourceContentChunkMapper,
  ) {
    super();
  }

  async findById(id: UUID): Promise<Source | null> {
    const entity = await this.sourceRepository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.sourceMapper.toDomain(entity);
  }

  async findAllByThreadId(threadId: UUID): Promise<Source[]> {
    const entities = await this.sourceRepository.find({
      where: { threadId },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.sourceMapper.toDomain(entity));
  }

  async findAllByUserId(userId: UUID): Promise<Source[]> {
    const entities = await this.sourceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.sourceMapper.toDomain(entity));
  }

  async create(source: Source): Promise<Source> {
    const entity = this.sourceMapper.toEntity(source);
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity);
  }

  async createFileSource(source: FileSource): Promise<FileSource> {
    const entity = this.sourceMapper.fileSourceToEntity(source);
    this.logger.debug(`Saving file source`, {
      entity,
    });
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity) as FileSource;
  }

  async createUrlSource(source: UrlSource): Promise<UrlSource> {
    const entity = this.sourceMapper.urlSourceToEntity(source);
    this.logger.debug(`Saving URL source: ${JSON.stringify(entity)}`, {
      entity,
    });
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity) as UrlSource;
  }

  async createSourceContentChunks(
    sourceContentChunks: SourceContentChunk[],
  ): Promise<SourceContentChunk[]> {
    const entities = sourceContentChunks.map((chunk) =>
      this.sourceContentChunkMapper.toEntity(chunk),
    );
    const savedEntities =
      await this.sourceContentChunkRepository.save(entities);
    this.logger.debug(`Created ${savedEntities.length} chunks in db`);
    return savedEntities.map((entity) =>
      this.sourceContentChunkMapper.toDomain(entity),
    );
  }

  async update(source: Source): Promise<Source> {
    const entity = this.sourceMapper.toEntity(source);
    const savedEntity = await this.sourceRepository.save(entity);

    return this.sourceMapper.toDomain(savedEntity);
  }

  async delete(id: UUID): Promise<void> {
    await this.sourceRepository.delete(id);
  }

  async matchSourceContentChunks(
    queryVector: number[],
    filter: {
      sourceId: UUID;
    },
    options?: {
      similarityThreshold?: number;
      limit?: number;
    },
  ): Promise<SourceContentChunk[]> {
    // Validate input
    if (!queryVector || queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for vector search');
      return [];
    }

    if (!filter.sourceId) {
      this.logger.warn('No sourceId provided in filter for vector search');
      return [];
    }

    try {
      // Use provided options or defaults
      const similarityThreshold = options?.similarityThreshold ?? 0.6;
      const limit = options?.limit ?? 10;

      // Convert the vector to PostgreSQL array format
      const queryVectorString = JSON.stringify(queryVector);

      // Build the query using TypeORM query builder
      const queryBuilder = this.sourceContentChunkRepository
        .createQueryBuilder('chunk')
        // Join with sourceContent to ensure the relationship is loaded
        .leftJoinAndSelect('chunk.sourceContent', 'sourceContent')
        // Add cosine similarity as calculated field (1 - cosine distance)
        .addSelect(`1 - (chunk.vector <=> :queryVector)`, 'cosine_similarity')
        // Use built-in where methods for standard comparisons
        .where('chunk.sourceId = :sourceId', { sourceId: filter.sourceId })
        .andWhere('chunk.vector IS NOT NULL')
        // Use cosine similarity threshold (higher is better, so use >=)
        .andWhere('1 - (chunk.vector <=> :queryVector) >= :threshold', {
          queryVector: queryVectorString,
          threshold: similarityThreshold,
        })
        // Order by cosine similarity DESC (highest similarity first)
        .orderBy('1 - (chunk.vector <=> :queryVector)', 'DESC')
        .setParameter('queryVector', queryVectorString)
        .limit(limit);

      // Get both raw results (with cosine similarity) and entities
      const { entities, raw } = await queryBuilder.getRawAndEntities();

      this.logger.debug(
        `Found ${entities.length} similar chunks for vector search in source ${filter.sourceId} ` +
          `(threshold: ${similarityThreshold}, vector dim: ${queryVector.length}, limit: ${limit}, cosine similarity: ${raw
            .filter(
              (r: { cosine_similarity: number }) =>
                r.cosine_similarity !== null,
            )
            .map((r: { cosine_similarity: number }) =>
              r.cosine_similarity.toFixed(2),
            )
            .join(', ')})`,
      );

      // Return the properly mapped entities
      return entities.map((entity) =>
        this.sourceContentChunkMapper.toDomain(entity),
      );
    } catch (error) {
      this.logger.error(
        `Error performing vector search in source ${filter.sourceId}:`,
        error,
      );
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
