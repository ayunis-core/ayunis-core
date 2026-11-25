import { randomUUID, type UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { OparlBodySummary } from 'src/domain/oparl/application/models/oparl-body-summary';
import type { MirrorObject } from 'src/domain/oparl/application/models/oparl-object';
import {
  OparlMirrorRepository,
  type OparlMirrorScope,
} from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import type { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlTypeReconciliation } from 'src/domain/oparl/domain/oparl-reconciliation';
import type { OparlTypeCounts } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import {
  countByTypeSql,
  countUnlistedSql,
  deleteSql,
  deleteUnlistedSql,
  linkReferencesSql,
  replaceJoinSql,
  upsertSql,
} from './oparl-mirror-sql';
import { OPARL_DELETE_ORDER, oparlTable } from './oparl-mirror-tables';

interface WrittenRow {
  id: UUID;
  oparlId: string;
}

@Injectable()
export class PostgresOparlMirrorRepository extends OparlMirrorRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get manager(): EntityManager {
    // Sync jobs run without an ambient transaction.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.dataSource.manager;
  }

  async write(
    scope: OparlMirrorScope,
    type: OparlEntityType,
    objects: MirrorObject[],
  ): Promise<number> {
    let written = 0;
    for (const embedded of [false, true]) {
      const batch = objects.filter((object) => object.embedded === embedded);
      if (batch.length === 0) continue;
      const rows = await this.upsert(scope, type, batch, embedded);
      await this.replaceJoins(scope.systemId, type, batch, rows);
      written += rows.length;
    }
    return written;
  }

  private async upsert(
    scope: OparlMirrorScope,
    type: OparlEntityType,
    objects: MirrorObject[],
    embedded: boolean,
  ): Promise<WrittenRow[]> {
    const table = oparlTable(type);
    const rows = objects.map((object) => ({
      id: randomUUID(),
      oparlId: object.oparlId,
      web: object.web,
      oparlCreated: object.oparlCreated,
      oparlModified: object.oparlModified,
      raw: object.raw,
      ...object.fields,
      ...Object.fromEntries(
        table.refs.map(({ ref }) => [`${ref}OparlId`, object.refs[ref]]),
      ),
    }));
    const params: unknown[] = [JSON.stringify(rows), scope.systemId];
    if (table.bodyScoped) params.push(scope.bodyId);
    return await this.manager.query<WrittenRow[]>(
      upsertSql(type, embedded),
      params,
    );
  }

  private async replaceJoins(
    systemId: UUID,
    type: OparlEntityType,
    objects: MirrorObject[],
    written: WrittenRow[],
  ): Promise<void> {
    const joins = oparlTable(type).joins;
    if (joins.length === 0 || written.length === 0) return;
    const ownerIds = new Map(written.map((row) => [row.oparlId, row.id]));
    const owners = objects.filter((object) => ownerIds.has(object.oparlId));
    for (const join of joins) {
      const rows = owners.flatMap((object) =>
        object.joins[join.relation].map((targetOparlId) => ({
          ownerId: ownerIds.get(object.oparlId),
          targetOparlId,
        })),
      );
      const sql = replaceJoinSql(join.table, join.targetTable);
      await this.manager.query(sql.remove, [[...ownerIds.values()]]);
      if (rows.length > 0)
        await this.manager.query(sql.insert, [JSON.stringify(rows), systemId]);
    }
  }

  async delete(
    systemId: UUID,
    type: OparlEntityType,
    oparlIds: string[],
  ): Promise<number> {
    if (oparlIds.length === 0) return 0;
    const [{ n }] = await this.manager.query<Array<{ n: number }>>(
      deleteSql(type),
      [systemId, oparlIds],
    );
    return n;
  }

  async linkReferences(systemId: UUID): Promise<void> {
    for (const sql of linkReferencesSql())
      await this.manager.query(sql, [systemId]);
  }

  async markListed(
    runId: UUID,
    type: OparlEntityType,
    oparlIds: string[],
  ): Promise<void> {
    if (oparlIds.length === 0) return;
    await this.manager.query(
      `INSERT INTO "oparl_sync_listed_objects" ("runId", "entityType", "oparlId")
       SELECT $1, $2, unnest($3::text[]) ON CONFLICT DO NOTHING`,
      [runId, type, oparlIds],
    );
  }

  async countUnlisted(
    systemId: UUID,
    runId: UUID,
  ): Promise<OparlTypeReconciliation[]> {
    return await this.manager.query<OparlTypeReconciliation[]>(
      countUnlistedSql(),
      [systemId, runId],
    );
  }

  async deleteUnlisted(systemId: UUID, runId: UUID): Promise<OparlTypeCounts> {
    const deleted: OparlTypeCounts = {};
    for (const type of OPARL_DELETE_ORDER) {
      const [{ n }] = await this.manager.query<Array<{ n: number }>>(
        deleteUnlistedSql(type),
        [systemId, runId],
      );
      if (n > 0) deleted[type] = n;
    }
    return deleted;
  }

  async forgetListed(runIds: UUID[]): Promise<void> {
    if (runIds.length === 0) return;
    await this.manager.query(
      `DELETE FROM "oparl_sync_listed_objects" WHERE "runId" = ANY($1::text[])`,
      [runIds],
    );
  }

  async countByType(systemIds: UUID[]): Promise<Map<UUID, OparlTypeCounts>> {
    const counts = new Map<UUID, OparlTypeCounts>(
      systemIds.map((id) => [id, {}]),
    );
    if (systemIds.length === 0) return counts;
    const rows = await this.manager.query<
      Array<{ systemId: UUID; type: OparlEntityType; count: number }>
    >(countByTypeSql(), [systemIds]);
    for (const { systemId, type, count } of rows)
      counts.get(systemId)![type] = count;
    return counts;
  }

  async findBodies(systemIds: UUID[]): Promise<OparlBodySummary[]> {
    if (systemIds.length === 0) return [];
    return await this.manager.query<OparlBodySummary[]>(
      `SELECT "id", "systemId", "oparlId", "name", "shortName", "web"
       FROM "oparl_bodies" WHERE "systemId" = ANY($1::text[])
       ORDER BY "name" NULLS LAST, "oparlId"`,
      [systemIds],
    );
  }
}
