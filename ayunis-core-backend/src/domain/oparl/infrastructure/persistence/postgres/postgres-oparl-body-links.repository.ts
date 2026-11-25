import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import {
  In,
  QueryFailedError,
  type EntityManager,
  type Repository,
} from 'typeorm';
import type {
  OparlCatalogBody,
  OparlLinkedBody,
  OparlLinkingOrg,
} from 'src/domain/oparl/application/models/oparl-linked-body';
import { OparlBodyLinksRepository } from 'src/domain/oparl/application/ports/oparl-body-links.repository';
import type { OparlBodyLink } from 'src/domain/oparl/domain/oparl-body-link.entity';
import { OparlBodyLinkRecord } from './schema/oparl-body-link.record';
import { OparlBodyRecord } from './schema/oparl-body.record';

const PG_FOREIGN_KEY_VIOLATION = '23503';

const CATALOG_COLUMNS = `b."id", b."systemId", b."oparlId", b."name", b."shortName", b."web",
  s."name" AS "systemName", l."createdAt" AS "linkedAt"`;

const CATALOG_ORDER = `ORDER BY b."name" NULLS LAST, s."name" NULLS LAST, b."oparlId"`;

@Injectable()
export class PostgresOparlBodyLinksRepository extends OparlBodyLinksRepository {
  constructor(
    @InjectRepository(OparlBodyLinkRecord)
    private readonly defaultRepository: Repository<OparlBodyLinkRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<OparlBodyLinkRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(OparlBodyLinkRecord) ?? this.defaultRepository
    );
  }

  findCatalog(orgId: UUID): Promise<OparlCatalogBody[]> {
    return this.repository.query<OparlCatalogBody[]>(
      `SELECT ${CATALOG_COLUMNS}
       FROM "oparl_bodies" b
       JOIN "oparl_systems" s ON s."id" = b."systemId"
       LEFT JOIN "oparl_body_links" l ON l."bodyId" = b."id" AND l."orgId" = $1
       ${CATALOG_ORDER}`,
      [orgId],
    );
  }

  findLinked(orgId: UUID): Promise<OparlLinkedBody[]> {
    return this.repository.query<OparlLinkedBody[]>(
      `SELECT ${CATALOG_COLUMNS}
       FROM "oparl_body_links" l
       JOIN "oparl_bodies" b ON b."id" = l."bodyId"
       JOIN "oparl_systems" s ON s."id" = b."systemId"
       WHERE l."orgId" = $1
       ${CATALOG_ORDER}`,
      [orgId],
    );
  }

  async link(links: OparlBodyLink[]): Promise<boolean> {
    if (links.length === 0) return true;
    try {
      await this.repository
        .createQueryBuilder()
        .insert()
        .values(
          links.map((link) => ({
            id: link.id,
            orgId: link.orgId,
            bodyId: link.bodyId,
            linkedByUserId: link.linkedByUserId,
            createdAt: link.linkedAt,
            updatedAt: link.linkedAt,
          })),
        )
        .orIgnore()
        .execute();
      return true;
    } catch (error) {
      // One statement: a missing body rejects every link of the request.
      if (this.violatesBodyReference(error)) return false;
      throw error;
    }
  }

  private violatesBodyReference(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const { code, constraint } = error.driverError as {
      code?: string;
      constraint?: string;
    };
    const bodyReference = this.repository.metadata.foreignKeys.find(
      (foreignKey) =>
        foreignKey.referencedEntityMetadata.target === OparlBodyRecord,
    );
    return (
      code === PG_FOREIGN_KEY_VIOLATION &&
      constraint !== undefined &&
      constraint === bodyReference?.name
    );
  }

  async unlink(orgId: UUID, bodyId: UUID): Promise<boolean> {
    const result = await this.repository.delete({ orgId, bodyId });
    return (result.affected ?? 0) > 0;
  }

  async findLinkingOrgs(
    bodyIds: UUID[],
  ): Promise<Map<UUID, OparlLinkingOrg[]>> {
    const byBody = new Map<UUID, OparlLinkingOrg[]>();
    if (bodyIds.length === 0) return byBody;
    const records = await this.repository.find({
      where: { bodyId: In(bodyIds) },
      relations: { org: true },
      order: { org: { name: 'ASC' }, createdAt: 'ASC' },
    });
    for (const record of records) {
      const orgs = byBody.get(record.bodyId) ?? [];
      orgs.push({
        id: record.orgId,
        name: record.org.name,
        linkedAt: record.createdAt,
      });
      byBody.set(record.bodyId, orgs);
    }
    return byBody;
  }
}
