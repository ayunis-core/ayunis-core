import { Injectable, Logger } from '@nestjs/common';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ParentChunk } from './domain/parent-chunk.entity';
import { UUID } from 'crypto';
import { ParentChildIndexerRepositoryPort } from './application/ports/parent-child-indexer-repository.port';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

@Injectable()
export class ParentChildIndexerRepository extends ParentChildIndexerRepositoryPort {
  private readonly logger = new Logger(ParentChildIndexerRepository.name);
  constructor(
    @InjectRepository(ParentChunkRecord)
    private readonly parentChunkRepository: Repository<ParentChunkRecord>,
    private readonly parentChildIndexerMapper: ParentChildIndexerMapper,
  ) {
    super();
  }

  async save(parentChunk: ParentChunk) {
    const parentChunkRecord =
      this.parentChildIndexerMapper.toParentChunkRecord(parentChunk);
    await this.parentChunkRepository.save(parentChunkRecord);
  }

  async delete(relatedDocumentId: UUID) {
    const parentChunk = await this.parentChunkRepository.findOne({
      where: { relatedDocumentId },
    });
    if (!parentChunk) {
      return;
    }
    await this.parentChunkRepository.remove(parentChunk);
  }

  async find(
    queryVector: number[],
    relatedDocumentId: UUID,
  ): Promise<ParentChunk[]> {
    // Validate input
    if (!queryVector || queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for vector search');
      return [];
    }

    if (!relatedDocumentId) {
      this.logger.warn(
        'No relatedDocumentId provided in filter for vector search',
      );
      return [];
    }

    this.logger.debug(
      `Starting vector search for document ${relatedDocumentId} with vector of dimension ${queryVector.length}`,
    );

    // Determine which column to use based on query dimension
    const queryDims = queryVector.length;
    const embeddingColumn =
      queryDims === 1536
        ? 'children.embedding_1536'
        : queryDims === 1024
          ? 'children.embedding_1024'
          : null;

    if (!embeddingColumn) {
      this.logger.warn(
        `Unsupported query vector dimension ${queryDims}. Only 1024 and 1536 are supported.`,
      );
      return [];
    }

    try {
      const limit = 10;

      // Convert the vector to PostgreSQL array format
      const queryVectorString = JSON.stringify(queryVector);

      // Build the exact search query using cosine distance ordering (ASC)
      const queryBuilder = this.parentChunkRepository
        .createQueryBuilder('parentChunk')
        .leftJoinAndSelect('parentChunk.children', 'children')
        .where('parentChunk.relatedDocumentId = :relatedDocumentId', {
          relatedDocumentId,
        })
        .andWhere(`${embeddingColumn} IS NOT NULL`)
        // Order by cosine distance ascending (closest first)
        .orderBy(`${embeddingColumn} <=> :queryVector::vector`, 'ASC')
        .setParameter('queryVector', queryVectorString)
        .limit(limit);

      const { entities } = await queryBuilder.getRawAndEntities();

      // Map and return unique parent entities
      return entities.map((entity) =>
        this.parentChildIndexerMapper.toParentChunkEntity(entity),
      );
    } catch (error) {
      this.logger.error(
        `Error performing vector search in relatedDocumentId ${relatedDocumentId}:`,
        {
          error: error instanceof Error ? error.message : String(error),
          queryVectorLength: queryVector.length,
          relatedDocumentId,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
