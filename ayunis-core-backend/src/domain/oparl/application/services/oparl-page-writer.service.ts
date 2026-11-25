import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlTypeCounts } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type {
  ExtractedObjects,
  MirrorObject,
} from 'src/domain/oparl/application/models/oparl-object';
import {
  OparlMirrorRepository,
  type OparlMirrorScope,
} from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlObjectExtractor } from './oparl-object-extractor.service';

export interface OparlPageResult {
  written: OparlTypeCounts;
  deleted: OparlTypeCounts;
  /** Items that are no OParl objects. */
  invalid: number;
}

export interface OparlWrittenBody {
  id: UUID;
  oparlId: string;
  raw: Record<string, unknown>;
}

/** Like the extractor: an object with a non-empty string ID. */
function isIdentified(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const { id } = item as { id?: unknown };
  return typeof id === 'string' && id.length > 0;
}

function modifiedTime(object: MirrorObject): number {
  return object.oparlModified ? Date.parse(object.oparlModified) : -Infinity;
}

/** One object per type and OParl ID: the listed form, else the latest embedded one. */
function dedupe(objects: MirrorObject[]): Map<OparlEntityType, MirrorObject[]> {
  const byType = new Map<OparlEntityType, Map<string, MirrorObject>>();
  for (const object of objects) {
    const ofType = byType.get(object.type) ?? new Map<string, MirrorObject>();
    byType.set(object.type, ofType);
    const kept = ofType.get(object.oparlId);
    const replaces =
      !kept ||
      (kept.embedded &&
        (!object.embedded || modifiedTime(object) > modifiedTime(kept)));
    if (replaces) ofType.set(object.oparlId, object);
  }
  return new Map(
    [...byType].map(([type, ofType]) => [type, [...ofType.values()]]),
  );
}

function add(counts: OparlTypeCounts, type: OparlEntityType, n: number): void {
  if (n > 0) counts[type] = (counts[type] ?? 0) + n;
}

/**
 * Writes what a page of a list amounts to, in one transaction: the objects
 * and what they embed, deletions, and for a full listing what it contained.
 */
@Injectable()
export class OparlPageWriter {
  constructor(
    private readonly mirror: OparlMirrorRepository,
    private readonly extractor: OparlObjectExtractor,
  ) {}

  @Transactional()
  async writePage(
    scope: OparlMirrorScope,
    type: OparlEntityType,
    items: unknown[],
    listingRunId: UUID | null,
  ): Promise<OparlPageResult> {
    const extracted = this.extractAll(items, type);
    const result: OparlPageResult = {
      written: {},
      deleted: {},
      invalid: items.filter((item) => !isIdentified(item)).length,
    };
    await this.apply(scope, extracted, listingRunId, result);
    return result;
  }

  /**
   * Bodies first, then what they embed (legislative terms, their location)
   * under each body. Returns the bodies listed, with their rows.
   */
  @Transactional()
  async writeBodies(
    systemId: UUID,
    items: unknown[],
    listingRunId: UUID | null,
  ): Promise<{ bodies: OparlWrittenBody[]; result: OparlPageResult }> {
    const result: OparlPageResult = {
      written: {},
      deleted: {},
      invalid: items.filter((item) => !isIdentified(item)).length,
    };
    const perBody = items.map((item) =>
      this.extractor.extract(item, OparlEntityType.BODY),
    );
    const bodyObjects: ExtractedObjects = {
      objects: perBody.flatMap((e) => e.objects.filter((o) => !o.embedded)),
      deleted: perBody.flatMap((e) => e.deleted),
    };
    await this.apply(
      { systemId, bodyId: null },
      bodyObjects,
      listingRunId,
      result,
    );
    const rows = await this.mirror.findBodies([systemId]);
    const bodies: OparlWrittenBody[] = [];
    for (const extracted of perBody) {
      const body = extracted.objects.find((o) => !o.embedded);
      const row = body && rows.find((r) => r.oparlId === body.oparlId);
      if (!body || !row) continue;
      bodies.push({ id: row.id, oparlId: body.oparlId, raw: body.raw });
      const embedded = extracted.objects.filter((o) => o.embedded);
      await this.apply(
        { systemId, bodyId: row.id },
        { objects: embedded, deleted: [] },
        listingRunId,
        result,
      );
    }
    return { bodies, result };
  }

  private extractAll(
    items: unknown[],
    type: OparlEntityType,
  ): ExtractedObjects {
    const all: ExtractedObjects = { objects: [], deleted: [] };
    for (const item of items) {
      const { objects, deleted } = this.extractor.extract(item, type);
      all.objects.push(...objects);
      all.deleted.push(...deleted);
    }
    return all;
  }

  private async apply(
    scope: OparlMirrorScope,
    extracted: ExtractedObjects,
    listingRunId: UUID | null,
    result: OparlPageResult,
  ): Promise<void> {
    const byType = dedupe(extracted.objects);
    // A listed location is kept only as the place of something, so the rest go first.
    const types = [...byType.keys()].sort(
      (a, b) =>
        Number(a === OparlEntityType.LOCATION) -
        Number(b === OparlEntityType.LOCATION),
    );
    for (const type of types) {
      const objects = byType.get(type)!;
      add(result.written, type, await this.mirror.write(scope, type, objects));
      if (listingRunId)
        await this.mirror.markListed(
          listingRunId,
          type,
          objects.map((o) => o.oparlId),
        );
    }
    for (const type of new Set(extracted.deleted.map((d) => d.type))) {
      const ids = extracted.deleted
        .filter((d) => d.type === type)
        .map((d) => d.oparlId);
      add(
        result.deleted,
        type,
        await this.mirror.delete(scope.systemId, type, ids),
      );
    }
  }
}
