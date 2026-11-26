import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import type {
  OparlChunkMatch,
  OparlQueryVector,
  OparlReadScope,
  OparlSearchHit,
  OparlSearchOutcome,
} from 'src/domain/oparl/application/models/oparl-search';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlReadRepository } from 'src/domain/oparl/application/ports/oparl-read.repository';
import { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';
import { OparlReadScopeService } from 'src/domain/oparl/application/services/oparl-read-scope.service';
import {
  bestPerPassage,
  fuseRankings,
  type OparlFusedMatch,
  type OparlRanking,
} from 'src/domain/oparl/domain/oparl-rank-fusion';
import { SearchOparlQuery } from './search-oparl.query';

/**
 * Candidates per query and ranking, fused into the results. The same for
 * every page, so the pages split one ranking.
 */
const CANDIDATES = 40;
const PAGE_SIZE = 10;

/**
 * Hybrid search of the org's linked bodies: German full-text ranks and, with
 * an OParl embedding model, vector ranks, fused by reciprocal rank, one
 * result per passage, a page at a time. Without a model, or when its
 * provider fails, full-text alone.
 */
@Injectable()
export class SearchOparlUseCase {
  private readonly logger = new Logger(SearchOparlUseCase.name);

  constructor(
    private readonly scopes: OparlReadScopeService,
    private readonly reads: OparlReadRepository,
    private readonly embedder: OparlChunkEmbedder,
    private readonly embedText: EmbedTextUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: SearchOparlQuery): Promise<OparlSearchOutcome> {
    this.logger.log(
      { queryCount: query.queries.length, bodyIds: query.bodyIds },
      'Searching OParl',
    );
    const { page } = query;
    const scope = await this.scopes.resolve(query.bodyIds);
    if (scope.bodyIds.length === 0) {
      return { results: [], page, hasMore: false, mode: 'full_text' };
    }
    const vectors = await this.embedQueries(query.queries);
    const { rankings, passages } = await this.rank(scope, query, vectors);
    const ranked = bestPerPassage(
      fuseRankings(rankings),
      (id) => passages.get(id) ?? id,
    );
    const start = (page - 1) * PAGE_SIZE;
    const matches = ranked.slice(start, start + PAGE_SIZE);
    const hits = await this.reads.findHits(
      scope,
      matches.map(({ id }) => id),
    );
    return {
      results: inFusedOrder(matches, hits),
      page,
      hasMore: ranked.length > start + PAGE_SIZE,
      mode: vectors ? 'hybrid' : 'full_text',
    };
  }

  private async rank(
    scope: OparlReadScope,
    query: SearchOparlQuery,
    vectors: OparlQueryVector[] | null,
  ): Promise<{
    rankings: OparlRanking<UUID>[];
    passages: Map<UUID, string>;
  }> {
    const rankings: OparlRanking<UUID>[] = [];
    const passages = new Map<UUID, string>();
    const record = (text: string, matches: OparlChunkMatch[]) => {
      for (const { id, passage } of matches) passages.set(id, passage);
      rankings.push({ query: text, ids: matches.map(({ id }) => id) });
    };
    // One query at a time, its two rankings at once: at most two connections.
    for (const [index, text] of query.queries.entries()) {
      const vector = vectors?.[index];
      const [fullText, nearest] = await Promise.all([
        this.reads.fullTextMatches(scope, text, query.filters, CANDIDATES),
        vector
          ? this.reads.vectorMatches(scope, vector, query.filters, CANDIDATES)
          : Promise.resolve([]),
      ]);
      record(text, fullText);
      record(text, nearest);
    }
    return { rankings, passages };
  }

  private async embedQueries(
    queries: string[],
  ): Promise<OparlQueryVector[] | null> {
    const model = await this.embedder.currentModel();
    if (!model) return null;
    try {
      const embeddings = await this.embedText.execute(
        new EmbedTextCommand({
          model,
          texts: queries,
          priority: EmbeddingPriority.RETRIEVAL,
        }),
      );
      return embeddings.map(({ vector }) => toQueryVector(model, vector));
    } catch (error) {
      if (!(error instanceof ApplicationError)) throw error;
      this.logger.warn(
        { modelId: model.id, err: error },
        'Could not embed the OParl search queries; searching full text only',
      );
      return null;
    }
  }
}

function toQueryVector(
  model: EmbeddingModel,
  vector: number[],
): OparlQueryVector {
  return { modelId: model.id, dimensions: model.dimensions, vector };
}

function inFusedOrder(
  matches: OparlFusedMatch<UUID>[],
  hits: OparlSearchHit[],
) {
  const byId = new Map(hits.map((hit) => [hit.chunkId, hit]));
  return matches.flatMap(({ id, matchedQueries }) => {
    const hit = byId.get(id);
    return hit ? [{ ...hit, matchedQueries }] : [];
  });
}
