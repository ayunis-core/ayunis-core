import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  OparlFileContent,
  OparlListFilters,
  OparlListItem,
  OparlListPage,
  OparlListType,
  OparlObjectDetail,
} from 'src/domain/oparl/application/models/oparl-read';
import type {
  OparlQueryVector,
  OparlReadScope,
  OparlSearchFilters,
  OparlSearchHit,
} from 'src/domain/oparl/application/models/oparl-search';
import { OparlReadRepository } from 'src/domain/oparl/application/ports/oparl-read.repository';
import type { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import {
  MEETING_SQL,
  ORGANIZATION_SQL,
  PAPER_SQL,
  PERSON_SQL,
} from './oparl-object-sql';
import {
  FILE_CONTENT_SQL,
  HITS_SQL,
  OBJECT_KIND_SQL,
  fullTextSql,
  listSql,
  vectorSql,
  type OparlObjectKind,
} from './oparl-read-sql';

/**
 * How far a filtered HNSW scan may go before it gives up; the pgvector
 * default (20,000) can end a selective filter's scan with too few rows.
 */
const HNSW_MAX_SCAN_TUPLES = 50_000;
const HNSW_EF_SEARCH = 100;

interface HitRow {
  chunkId: UUID;
  source: OparlChunkSource;
  text: string;
  date: string | null;
  pageNumber: number | null;
  bodyId: UUID;
  bodyName: string | null;
  paperId: UUID | null;
  paperName: string | null;
  paperReference: string | null;
  paperType: string | null;
  paperWeb: string | null;
  meetingId: UUID | null;
  meetingName: string | null;
  meetingStart: string | null;
  meetingWeb: string | null;
  agendaItemId: UUID | null;
  agendaItemNumber: string | null;
  agendaItemName: string | null;
  agendaItemWeb: string | null;
  fileId: UUID | null;
  fileName: string | null;
  fileAccessUrl: string | null;
}

const OBJECT_SQL: Record<OparlObjectKind, string> = {
  paper: PAPER_SQL,
  meeting: MEETING_SQL,
  organization: ORGANIZATION_SQL,
  person: PERSON_SQL,
};

@Injectable()
export class PostgresOparlReadRepository extends OparlReadRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async fullTextMatches(
    scope: OparlReadScope,
    query: string,
    filters: OparlSearchFilters,
    limit: number,
  ): Promise<UUID[]> {
    if (scope.bodyIds.length === 0) return [];
    const { sql, params } = fullTextSql(scope, query, filters, limit);
    const rows = await this.dataSource.query<Array<{ id: UUID }>>(sql, params);
    return rows.map(({ id }) => id);
  }

  async vectorMatches(
    scope: OparlReadScope,
    query: OparlQueryVector,
    filters: OparlSearchFilters,
    limit: number,
  ): Promise<UUID[]> {
    if (scope.bodyIds.length === 0) return [];
    const { sql, params } = vectorSql(scope, query, filters, limit);
    // SET LOCAL needs the transaction; it ends with it.
    const rows = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SET LOCAL hnsw.iterative_scan = relaxed_order`);
      await manager.query(`SET LOCAL hnsw.ef_search = ${HNSW_EF_SEARCH}`);
      await manager.query(
        `SET LOCAL hnsw.max_scan_tuples = ${HNSW_MAX_SCAN_TUPLES}`,
      );
      return manager.query<Array<{ id: UUID }>>(sql, params);
    });
    return rows.map(({ id }) => id);
  }

  async findHits(
    scope: OparlReadScope,
    chunkIds: UUID[],
  ): Promise<OparlSearchHit[]> {
    if (chunkIds.length === 0 || scope.bodyIds.length === 0) return [];
    const rows = await this.dataSource.query<HitRow[]>(HITS_SQL, [
      chunkIds,
      scope.bodyIds,
    ]);
    return rows.map(toHit);
  }

  async findObject(
    scope: OparlReadScope,
    id: UUID,
  ): Promise<OparlObjectDetail | null> {
    if (scope.bodyIds.length === 0) return null;
    const params = [id, scope.bodyIds];
    const kinds = await this.dataSource.query<Array<{ kind: OparlObjectKind }>>(
      OBJECT_KIND_SQL,
      params,
    );
    if (kinds.length === 0) return null;
    const { kind } = kinds[0];
    const rows = await this.dataSource.query<
      Array<Omit<OparlObjectDetail, 'type'>>
    >(OBJECT_SQL[kind], params);
    return rows.length > 0
      ? ({ type: kind, ...rows[0] } as OparlObjectDetail)
      : null;
  }

  async readFile(
    scope: OparlReadScope,
    fileId: UUID,
    fromPage: number,
    maxPages: number,
  ): Promise<OparlFileContent | null> {
    if (scope.bodyIds.length === 0) return null;
    const rows = await this.dataSource.query<FileContentRow[]>(
      FILE_CONTENT_SQL,
      [fileId, scope.bodyIds, fromPage, maxPages],
    );
    if (rows.length === 0) return null;
    const { status, skipReason, pageCount, pages, body, web, ...file } =
      rows[0];
    return {
      file: { ...file, body, web },
      status,
      skipReason,
      pageCount,
      pages,
    };
  }

  async list(
    scope: OparlReadScope,
    type: OparlListType,
    filters: OparlListFilters,
    page: { offset: number; limit: number },
  ): Promise<OparlListPage> {
    if (scope.bodyIds.length === 0) return { items: [], total: 0 };
    const { items, count } = listSql(scope, type, filters, page);
    const [rows, [{ total }]] = await Promise.all([
      this.dataSource.query<OparlListItem[]>(items.sql, items.params),
      this.dataSource.query<Array<{ total: number }>>(count.sql, count.params),
    ]);
    return { items: rows, total };
  }
}

type FileContentRow = OparlFileContent['file'] & Omit<OparlFileContent, 'file'>;

function toHit(row: HitRow): OparlSearchHit {
  return {
    chunkId: row.chunkId,
    source: row.source,
    text: row.text,
    date: row.date,
    body: { id: row.bodyId, name: row.bodyName },
    paper: row.paperId
      ? {
          id: row.paperId,
          name: row.paperName,
          reference: row.paperReference,
          paperType: row.paperType,
          web: row.paperWeb,
        }
      : null,
    meeting: row.meetingId
      ? {
          id: row.meetingId,
          name: row.meetingName,
          start: row.meetingStart,
          web: row.meetingWeb,
        }
      : null,
    agendaItem: row.agendaItemId
      ? {
          id: row.agendaItemId,
          number: row.agendaItemNumber,
          name: row.agendaItemName,
          web: row.agendaItemWeb,
        }
      : null,
    file: row.fileId
      ? {
          id: row.fileId,
          name: row.fileName,
          accessUrl: row.fileAccessUrl,
          pageNumber: row.pageNumber,
        }
      : null,
  };
}
