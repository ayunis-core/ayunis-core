import { randomUUID, type UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { toWellFormedText } from 'src/common/util/unicode-sanitizer';
import type { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  emptyOparlDocumentStats,
  type OparlChunkText,
  type OparlChunkToEmbed,
  type OparlDocumentStats,
  type OparlFilePage,
  type OparlFileText,
  type OparlPendingFile,
  type OparlTextObject,
} from 'src/domain/oparl/application/models/oparl-document';
import {
  OparlDocumentsRepository,
  type OparlObjectChunks,
} from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import {
  OPARL_FILE_MAX_ATTEMPTS,
  OparlFileTextStatus,
  type OparlFileSkipReason,
} from 'src/domain/oparl/domain/oparl-file-text';
import {
  CHUNKS_TO_EMBED_SQL,
  CONFIRM_FILE_TEXT_SQL,
  FILES_WITHOUT_CHUNKS_SQL,
  FILE_STATS_SQL,
  INDEX_STATS_SQL,
  INSERT_CHUNKS_SQL,
  LAST_FILE_ERRORS_SQL,
  OWNER_COLUMNS,
  PENDING_FILES_SQL,
  REFRESH_FILES_CONTEXT_SQL,
  REFRESH_SYSTEM_FILE_CONTEXT_SQL,
  SAVE_FILE_TEXT_SQL,
  HAS_VECTORS_OF_MODEL_SQL,
  SYSTEMS_WITH_DOCUMENT_WORK_SQL,
  saveEmbeddingsSql,
  textObjectsSql,
} from './oparl-documents-sql';

const PG_FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  return (
    record.code === PG_FOREIGN_KEY_VIOLATION ||
    isForeignKeyViolation(record.driverError)
  );
}

interface PendingFileRow {
  id: UUID;
  bodyId: UUID;
  name: string | null;
  fileName: string | null;
  mimeType: string | null;
  accessUrl: string | null;
  downloadUrl: string | null;
  size: string | null;
  fingerprint: string;
  status: OparlFileTextStatus | null;
  contentHash: string | null;
  pages?: OparlFilePage[] | null;
}

interface ChunkRow {
  id: UUID;
  bodyId: UUID;
  source: OparlChunkSource;
  paperId: UUID | null;
  meetingId: UUID | null;
  agendaItemId: UUID | null;
  fileId: UUID | null;
  date: string | null;
  pageNumber: number | null;
  ordinal: number;
  text: string;
  sourceHash: string | null;
}

type FileStatsRow = { systemId: UUID } & Record<
  'total' | 'pending' | 'extracted' | 'failed' | OparlFileSkipReason,
  number
>;

interface FileErrorRow {
  systemId: UUID;
  error: string | null;
}

interface IndexStatsRow {
  systemId: UUID;
  chunks: number;
  embedded: number;
}

function toFileCounts(
  row: FileStatsRow,
): Omit<OparlDocumentStats['files'], 'lastError'> {
  return {
    total: row.total,
    pending: row.pending,
    extracted: row.extracted,
    failed: row.failed,
    skipped: {
      too_large: row.too_large,
      too_many_pages: row.too_many_pages,
      unsupported_type: row.unsupported_type,
      unreadable: row.unreadable,
    },
  };
}

function toPendingFile(row: PendingFileRow): OparlPendingFile {
  return {
    id: row.id,
    bodyId: row.bodyId,
    name: row.name,
    fileName: row.fileName,
    mimeType: row.mimeType,
    accessUrl: row.accessUrl,
    downloadUrl: row.downloadUrl,
    size: row.size === null ? null : Number(row.size),
    fingerprint: row.fingerprint,
    previous: row.status
      ? { status: row.status, contentHash: row.contentHash }
      : null,
  };
}

function fileTextParams(
  file: OparlPendingFile,
  text: OparlFileText,
  chunkCount: number,
): unknown[] {
  const extracted = text.status === OparlFileTextStatus.EXTRACTED;
  const skipped = text.status === OparlFileTextStatus.SKIPPED;
  return [
    file.id,
    text.status,
    skipped ? text.reason : null,
    extracted ? null : text.error,
    text.status === OparlFileTextStatus.FAILED ? null : text.contentHash,
    extracted ? text.pages.length : null,
    extracted ? JSON.stringify(text.pages.map(wellFormedPage)) : null,
    chunkCount,
    file.fingerprint,
  ];
}

// jsonb rejects NUL and lone surrogates (an emoji split at a chunk
// boundary, or garbled text from a PDF); one would fail the job on every try.
function wellFormedPage(page: OparlFilePage): OparlFilePage {
  return { number: page.number, text: toWellFormedText(page.text) };
}

function objectChunkRow(
  source: OparlTextObject['source'],
  { object, hash }: OparlObjectChunks,
  chunk: OparlChunkText,
): ChunkRow {
  return {
    id: randomUUID(),
    bodyId: object.bodyId,
    source,
    paperId: source === OparlChunkSource.PAPER ? object.id : null,
    meetingId:
      source === OparlChunkSource.MEETING ? object.id : object.meetingId,
    agendaItemId: source === OparlChunkSource.AGENDA_ITEM ? object.id : null,
    fileId: null,
    date: object.date,
    pageNumber: null,
    ordinal: chunk.ordinal,
    text: toWellFormedText(chunk.text),
    sourceHash: hash,
  };
}

function fileChunkRow(file: OparlPendingFile, chunk: OparlChunkText): ChunkRow {
  return {
    id: randomUUID(),
    bodyId: file.bodyId,
    source: OparlChunkSource.FILE,
    paperId: null,
    meetingId: null,
    agendaItemId: null,
    fileId: file.id,
    date: null,
    pageNumber: chunk.pageNumber,
    ordinal: chunk.ordinal,
    text: toWellFormedText(chunk.text),
    sourceHash: null,
  };
}

@Injectable()
export class PostgresOparlDocumentsRepository extends OparlDocumentsRepository {
  private readonly logger = new Logger(PostgresOparlDocumentsRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async findPendingFiles(
    systemId: UUID,
    failedBefore: Date,
    exclude: UUID[],
    limit: number,
  ): Promise<OparlPendingFile[]> {
    const rows: PendingFileRow[] = await this.dataSource.query(
      PENDING_FILES_SQL,
      [systemId, OPARL_FILE_MAX_ATTEMPTS, failedBefore, limit, exclude],
    );
    return rows.map(toPendingFile);
  }

  async saveFileText(
    file: OparlPendingFile,
    text: OparlFileText,
    chunks: OparlChunkText[],
  ): Promise<boolean> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const saved: unknown[] = await manager.query(
          SAVE_FILE_TEXT_SQL,
          fileTextParams(file, text, chunks.length),
        );
        if (saved.length === 0) return false;
        if (text.status === OparlFileTextStatus.FAILED) return true;
        await manager.query(`DELETE FROM oparl_chunks WHERE "fileId" = $1`, [
          file.id,
        ]);
        await this.insertChunks(
          manager,
          chunks.map((chunk) => fileChunkRow(file, chunk)),
        );
        await manager.query(REFRESH_FILES_CONTEXT_SQL, [[file.id]]);
        return true;
      });
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.debug({ fileId: file.id }, 'File gone while it was read');
      return false;
    }
  }

  async confirmFileText(fileId: UUID, fingerprint: string): Promise<void> {
    await this.dataSource.query(CONFIRM_FILE_TEXT_SQL, [fileId, fingerprint]);
  }

  async findFilesWithoutChunks(
    systemId: UUID,
    limit: number,
  ): Promise<Array<{ file: OparlPendingFile; pages: OparlFilePage[] }>> {
    const rows: PendingFileRow[] = await this.dataSource.query(
      FILES_WITHOUT_CHUNKS_SQL,
      [systemId, limit],
    );
    return rows.map((row) => ({
      file: toPendingFile(row),
      pages: row.pages ?? [],
    }));
  }

  async refreshFileContext(systemId: UUID): Promise<void> {
    try {
      await this.dataSource.query(REFRESH_SYSTEM_FILE_CONTEXT_SQL, [systemId]);
    } catch (error) {
      // An object deleted meanwhile; the next run sets the context again.
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.debug({ systemId }, 'File context changed while refreshed');
    }
  }

  async findTextObjects(
    systemId: UUID,
    source: OparlTextObject['source'],
    afterId: UUID | null,
    limit: number,
  ): Promise<OparlTextObject[]> {
    const rows: Array<Omit<OparlTextObject, 'source'>> =
      await this.dataSource.query(textObjectsSql(source), [
        systemId,
        afterId,
        limit,
      ]);
    return rows.map((row) => ({ ...row, source }));
  }

  async replaceObjectChunks(
    source: OparlTextObject['source'],
    objects: OparlObjectChunks[],
  ): Promise<void> {
    if (objects.length === 0) return;
    const ids = objects.map(({ object }) => object.id);
    const rows = objects.flatMap((entry) =>
      entry.chunks.map((chunk) => objectChunkRow(source, entry, chunk)),
    );
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM oparl_chunks WHERE source = $1 AND "${OWNER_COLUMNS[source]}" = ANY($2)`,
          [source, ids],
        );
        await this.insertChunks(manager, rows);
      });
    } catch (error) {
      // An object deleted meanwhile; the next run indexes the others again.
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.debug({ source }, 'Object gone while it was indexed');
    }
  }

  async findChunksToEmbed(
    bodyId: UUID,
    modelId: UUID,
    afterId: UUID | null,
    limit: number,
  ): Promise<OparlChunkToEmbed[]> {
    return this.dataSource.query(CHUNKS_TO_EMBED_SQL, [
      bodyId,
      afterId,
      modelId,
      limit,
    ]);
  }

  async saveEmbeddings(
    modelId: UUID,
    dimensions: EmbeddingDimensions,
    vectors: Array<{ id: UUID; vector: number[] }>,
  ): Promise<void> {
    if (vectors.length === 0) return;
    await this.dataSource.query(saveEmbeddingsSql(dimensions), [
      modelId,
      vectors.map(({ id }) => id),
      vectors.map(({ vector }) => `[${vector.join(',')}]`),
    ]);
  }

  async hasVectorsOf(modelId: UUID): Promise<boolean> {
    const [row] = await this.dataSource.query<Array<{ exists: boolean }>>(
      HAS_VECTORS_OF_MODEL_SQL,
      [modelId],
    );
    return row.exists;
  }

  async findSystemsWithDocumentWork(modelId: UUID | null): Promise<UUID[]> {
    const rows = await this.dataSource.query<Array<{ id: UUID }>>(
      SYSTEMS_WITH_DOCUMENT_WORK_SQL,
      [modelId],
    );
    return rows.map(({ id }) => id);
  }

  async stats(
    systemIds: UUID[],
    modelId: UUID | null,
  ): Promise<Map<UUID, OparlDocumentStats>> {
    const result = new Map<UUID, OparlDocumentStats>(
      systemIds.map((id) => [id, emptyOparlDocumentStats()]),
    );
    if (systemIds.length === 0) return result;
    const [files, errors, index] = await Promise.all([
      this.dataSource.query<FileStatsRow[]>(FILE_STATS_SQL, [systemIds]),
      this.dataSource.query<FileErrorRow[]>(LAST_FILE_ERRORS_SQL, [systemIds]),
      this.dataSource.query<IndexStatsRow[]>(INDEX_STATS_SQL, [
        systemIds,
        modelId,
      ]),
    ]);
    for (const row of files) {
      const stats = result.get(row.systemId);
      if (stats) stats.files = { ...toFileCounts(row), lastError: null };
    }
    for (const row of errors) {
      const stats = result.get(row.systemId);
      if (stats) stats.files.lastError = row.error;
    }
    for (const row of index) {
      const stats = result.get(row.systemId);
      if (stats)
        stats.index = { chunks: row.chunks, embeddedChunks: row.embedded };
    }
    return result;
  }

  private async insertChunks(
    manager: EntityManager,
    rows: ChunkRow[],
  ): Promise<void> {
    if (rows.length > 0)
      await manager.query(INSERT_CHUNKS_SQL, [JSON.stringify(rows)]);
  }
}
