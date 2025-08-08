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

    // Check if we have any indexed content for this document first
    const existingChunksCount = await this.parentChunkRepository
      .createQueryBuilder('parentChunk')
      .leftJoin('parentChunk.children', 'children')
      .where('parentChunk.relatedDocumentId = :relatedDocumentId', {
        relatedDocumentId,
      })
      .andWhere('children.embedding IS NOT NULL')
      .getCount();

    if (existingChunksCount === 0) {
      this.logger.warn(
        `No indexed content found for document ${relatedDocumentId}`,
      );
      return [];
    }

    try {
      // Use provided options or defaults
      const similarityThreshold = 0.6;
      const limit = 10;

      // Convert the vector to PostgreSQL array format
      const queryVectorString = JSON.stringify(queryVector);

      // Build the query using TypeORM query builder
      const queryBuilder = this.parentChunkRepository
        .createQueryBuilder('parentChunk')
        // Join with sourceContent to ensure the relationship is loaded
        .leftJoinAndSelect('parentChunk.children', 'children')
        // Add cosine similarity as calculated field (1 - cosine distance)
        .addSelect(
          `1 - (children.embedding <=> :queryVector)`,
          'cosine_similarity',
        )
        .where('parentChunk.relatedDocumentId = :relatedDocumentId', {
          relatedDocumentId,
        })
        .andWhere('children.embedding IS NOT NULL')
        .andWhere('vector_dims(children.embedding) = :queryVectorLength', {
          queryVectorLength: queryVector.length,
        })
        // Use cosine similarity threshold (higher is better, so use >=)
        .andWhere('1 - (children.embedding <=> :queryVector) >= :threshold', {
          queryVector: queryVectorString,
          threshold: similarityThreshold,
        })
        // Order by cosine similarity DESC (highest similarity first)
        .orderBy('1 - (children.embedding <=> :queryVector)', 'DESC')
        .setParameter('queryVector', queryVectorString)
        .limit(limit);

      // Get both raw results (with cosine similarity) and entities
      this.logger.debug('Executing vector similarity query...');
      const { entities, raw } = await queryBuilder.getRawAndEntities();

      this.logger.debug(
        `Vector search found ${entities.length} parent chunks with ${raw.length} raw results`,
      );

      // Return the properly mapped entities
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
