import type { UUID } from 'crypto';
import type {
  OparlFileContent,
  OparlListFilters,
  OparlListPage,
  OparlListType,
  OparlObjectDetail,
} from 'src/domain/oparl/application/models/oparl-read';
import type {
  OparlChunkMatch,
  OparlQueryVector,
  OparlReadScope,
  OparlSearchFilters,
  OparlSearchHit,
} from 'src/domain/oparl/application/models/oparl-search';

/**
 * Reads the mirror for an org. Every method stays within the scope's bodies:
 * an object of another body is not found, a filter naming one matches nothing.
 */
export abstract class OparlReadRepository {
  /** Chunks by German full-text rank, best first. */
  abstract fullTextMatches(
    scope: OparlReadScope,
    query: string,
    filters: OparlSearchFilters,
    limit: number,
  ): Promise<OparlChunkMatch[]>;

  /** Chunks with a vector of the query's model, nearest first. */
  abstract vectorMatches(
    scope: OparlReadScope,
    query: OparlQueryVector,
    filters: OparlSearchFilters,
    limit: number,
  ): Promise<OparlChunkMatch[]>;

  /** The chunks with their paper, meeting, agenda item and file, in no particular order. */
  abstract findHits(
    scope: OparlReadScope,
    chunkIds: UUID[],
  ): Promise<OparlSearchHit[]>;

  /** A paper, meeting, organization or person by its ID. */
  abstract findObject(
    scope: OparlReadScope,
    id: UUID,
  ): Promise<OparlObjectDetail | null>;

  /** The file with up to `maxPages` pages of its text from page `fromPage` on. */
  abstract readFile(
    scope: OparlReadScope,
    fileId: UUID,
    fromPage: number,
    maxPages: number,
  ): Promise<OparlFileContent | null>;

  abstract list(
    scope: OparlReadScope,
    type: OparlListType,
    filters: OparlListFilters,
    page: { offset: number; limit: number },
  ): Promise<OparlListPage>;
}
