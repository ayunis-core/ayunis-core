import type { UUID } from 'crypto';
import type {
  OparlChunkText,
  OparlChunkToEmbed,
  OparlDocumentStats,
  OparlFilePage,
  OparlFileText,
  OparlPendingFile,
  OparlTextObject,
} from 'src/domain/oparl/application/models/oparl-document';
import type { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export interface OparlObjectChunks {
  object: OparlTextObject;
  hash: string;
  chunks: OparlChunkText[];
}

/**
 * The searchable form of the mirror: the text of its files, and chunks of
 * that text and of the text fields of papers, meetings and agenda items.
 * Chunks go with the object they reference (foreign keys cascade). Writes
 * for an object deleted in the meantime are dropped.
 */
export abstract class OparlDocumentsRepository {
  /**
   * Files of a system without text, whose metadata changed since they were
   * read, or that failed before `failedBefore` and may be tried again;
   * newest first, without the files in `exclude`.
   */
  abstract findPendingFiles(
    systemId: UUID,
    failedBefore: Date,
    exclude: UUID[],
    limit: number,
  ): Promise<OparlPendingFile[]>;

  /**
   * Records what a file holds as of `fingerprint`; an extracted file's
   * chunks replace its previous ones. `false` when the file is gone.
   */
  abstract saveFileText(
    file: OparlPendingFile,
    text: OparlFileText,
    chunks: OparlChunkText[],
  ): Promise<boolean>;

  /** The content did not change: only the fingerprint moves on. */
  abstract confirmFileText(fileId: UUID, fingerprint: string): Promise<void>;

  /** Files with text but no chunks (they went with a deleted paper or meeting), with their pages. */
  abstract findFilesWithoutChunks(
    systemId: UUID,
    limit: number,
  ): Promise<Array<{ file: OparlPendingFile; pages: OparlFilePage[] }>>;

  /** Sets the paper, meeting, agenda item and date of file chunks to what the mirror says now. */
  abstract refreshFileContext(systemId: UUID): Promise<void>;

  /** Papers, meetings or agenda items of a system after `afterId`, by ID. */
  abstract findTextObjects(
    systemId: UUID,
    source: OparlTextObject['source'],
    afterId: UUID | null,
    limit: number,
  ): Promise<OparlTextObject[]>;

  /** Replaces the chunks of the objects given. */
  abstract replaceObjectChunks(
    source: OparlTextObject['source'],
    objects: OparlObjectChunks[],
  ): Promise<void>;

  /** Chunks of a body after `afterId` without a vector of `modelId`, by ID. */
  abstract findChunksToEmbed(
    bodyId: UUID,
    modelId: UUID,
    afterId: UUID | null,
    limit: number,
  ): Promise<OparlChunkToEmbed[]>;

  /** Stores the vectors in the column of their dimensions; other columns are cleared. */
  abstract saveEmbeddings(
    modelId: UUID,
    dimensions: EmbeddingDimensions,
    vectors: Array<{ id: UUID; vector: number[] }>,
  ): Promise<void>;

  abstract hasVectorsOf(modelId: UUID): Promise<boolean>;

  /**
   * Systems with files not read as of their current metadata or, with a
   * model, chunks without a vector of it.
   */
  abstract findSystemsWithDocumentWork(modelId: UUID | null): Promise<UUID[]>;

  abstract stats(
    systemIds: UUID[],
    modelId: UUID | null,
  ): Promise<Map<UUID, OparlDocumentStats>>;
}
