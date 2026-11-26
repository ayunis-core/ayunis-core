import type { UUID } from 'crypto';
import type { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';

/**
 * What a search, list or lookup may read: the bodies of the org's links,
 * narrowed by the caller's body filter. Empty means nothing is found.
 */
export interface OparlReadScope {
  bodyIds: UUID[];
}

/** Structured filters of `oparl_search`; every one applies to both rankings. */
export interface OparlSearchFilters {
  /** Inclusive, `YYYY-MM-DD`, compared with the chunk's date. */
  from?: string;
  to?: string;
  /** Meetings of the organization and papers it submitted or deliberated. */
  organizationId?: UUID;
  /** Papers the person submitted and meetings they took part in. */
  personId?: UUID;
  /** Part of the paper type as the RIS names it, case-insensitive. */
  paperType?: string;
  /** Only chunks taken from these sources; all when omitted. */
  sources?: OparlChunkSource[];
  /** The meeting's own chunk, its agenda items and its documents. */
  meetingId?: UUID;
  /** The paper's own chunk, its documents and the agenda items deliberating it. */
  paperId?: UUID;
  /** The passages of one document. */
  fileId?: UUID;
}

/**
 * A chunk a ranking found and the passage it belongs to: a page of a
 * document, or a paper, meeting or agenda item. Overlapping chunks of one
 * passage are one result.
 */
export interface OparlChunkMatch {
  id: UUID;
  passage: string;
}

export interface OparlQueryVector {
  modelId: UUID;
  dimensions: EmbeddingDimensions;
  vector: number[];
}

export interface OparlSearchHit {
  chunkId: UUID;
  source: OparlChunkSource;
  text: string;
  date: string | null;
  body: { id: UUID; name: string | null };
  paper: {
    id: UUID;
    name: string | null;
    reference: string | null;
    paperType: string | null;
    web: string | null;
  } | null;
  meeting: {
    id: UUID;
    name: string | null;
    start: string | null;
    web: string | null;
  } | null;
  agendaItem: {
    id: UUID;
    number: string | null;
    name: string | null;
    web: string | null;
  } | null;
  file: {
    id: UUID;
    name: string | null;
    accessUrl: string | null;
    pageNumber: number | null;
  } | null;
}

export interface OparlSearchResult extends OparlSearchHit {
  matchedQueries: string[];
}

export interface OparlSearchOutcome {
  results: OparlSearchResult[];
  page: number;
  /** Whether a later page holds further results. */
  hasMore: boolean;
  /** `full_text` while no OParl embedding model is set or the provider failed. */
  mode: 'hybrid' | 'full_text';
}
