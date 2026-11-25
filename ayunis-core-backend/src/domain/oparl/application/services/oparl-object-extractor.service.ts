import { Injectable } from '@nestjs/common';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type {
  ExtractedObjects,
  MirrorObject,
  OparlScalar,
} from 'src/domain/oparl/application/models/oparl-object';
import {
  OPARL_TYPE_SPECS,
  type OparlFieldKind,
  type OparlTypeSpec,
} from 'src/domain/oparl/application/models/oparl-type-specs';

/**
 * Removed wherever such an object appears: a person's contact data
 * (AYC-2057), and an organization's address, which for a small body such as
 * an Ortsbeirat is its chair's home (AYC-2066).
 */
const PRIVATE_PROPERTIES = new Map<OparlEntityType, string[]>([
  [OparlEntityType.PERSON, ['email', 'phone', 'location', 'locationObject']],
  [OparlEntityType.ORGANIZATION, ['location', 'locationObject']],
]);
const TYPE_NAMES = new Map<string, OparlEntityType>([
  ['Person', OparlEntityType.PERSON],
  ['Organization', OparlEntityType.ORGANIZATION],
]);
const DATE = /^\d{4}-\d{2}-\d{2}/;
const DATETIME = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-][\d:]+)?)?$/;
const MAX_DEPTH = 8;

type Json = Record<string, unknown>;

interface Visit {
  type: OparlEntityType;
  embedded: boolean;
  parentRef?: string;
  parentId?: string;
  depth: number;
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idOf(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (isObject(value) && typeof value.id === 'string' && value.id.length > 0)
    return value.id;
  return null;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

/** By the expected type, or by the object's own `type` where it is embedded somewhere unexpected. */
function privateProperties(
  value: Json,
  type: OparlEntityType | null,
): string[] {
  const named =
    typeof value.type === 'string'
      ? TYPE_NAMES.get(value.type.split('/').pop() ?? '')
      : undefined;
  return [
    ...((type && PRIVATE_PROPERTIES.get(type)) ?? []),
    ...((named && PRIVATE_PROPERTIES.get(named)) ?? []),
  ];
}

function toText(value: unknown): string | null {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value : null;
}

/** The calendar date at the start of an ISO date or date-time, if it exists. */
function toDate(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE.test(value)) return null;
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === day
    ? day
    : null;
}

function toDatetime(value: unknown): string | null {
  return typeof value === 'string' &&
    DATETIME.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    toDate(value) !== null
    ? value
    : null;
}

function toInteger(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isSafeInteger(number)
    ? number
    : null;
}

const SCALARS: Record<OparlFieldKind, (value: unknown) => OparlScalar> = {
  text: toText,
  date: toDate,
  datetime: toDatetime,
  boolean: (value) => (typeof value === 'boolean' ? value : null),
  integer: toInteger,
  textArray: (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : null,
};

/**
 * Turns OParl objects into mirror objects: one per object, listed or
 * embedded at any depth, with its columns, references and original. A
 * person's contact data and an organization's address are removed from it
 * and from every original that embeds it before anything else happens.
 */
@Injectable()
export class OparlObjectExtractor {
  extract(value: unknown, type: OparlEntityType): ExtractedObjects {
    const result: ExtractedObjects = { objects: [], deleted: [] };
    this.collect(
      this.sanitize(value, type, 0),
      { type, embedded: false, depth: 0 },
      result,
    );
    return result;
  }

  /** A deep copy without persons' contact data and organizations' addresses. */
  private sanitize(
    value: unknown,
    type: OparlEntityType | null,
    depth: number,
  ): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.sanitize(item, type, depth + 1));
    if (!isObject(value) || depth > MAX_DEPTH) return value;
    const removed = privateProperties(value, type);
    const copy: Json = {};
    for (const [key, item] of Object.entries(value)) {
      if (removed.includes(key)) continue;
      copy[key] = this.sanitize(item, this.embeddedType(type, key), depth + 1);
    }
    return copy;
  }

  private embeddedType(
    type: OparlEntityType | null,
    key: string,
  ): OparlEntityType | null {
    if (!type) return null;
    const spec = OPARL_TYPE_SPECS[type];
    return (
      spec.refs.find((r) => r.source === key)?.target ??
      spec.joins.find((j) => j.source === key)?.target ??
      spec.children.find((c) => c.source === key)?.type ??
      null
    );
  }

  private collect(
    value: unknown,
    visit: Visit,
    result: ExtractedObjects,
  ): void {
    const oparlId = isObject(value) ? idOf(value) : null;
    if (!isObject(value) || !oparlId || visit.depth > MAX_DEPTH) return;
    if (value.deleted === true) {
      result.deleted.push({ type: visit.type, oparlId });
      return;
    }
    const spec = OPARL_TYPE_SPECS[visit.type];
    const object = this.toMirrorObject(value, oparlId, visit, spec);
    if (visit.parentRef && visit.parentId)
      object.refs[visit.parentRef] ??= visit.parentId;
    result.objects.push(object);
    this.collectEmbedded(value, oparlId, spec, result, visit.depth);
  }

  private collectEmbedded(
    value: Json,
    oparlId: string,
    spec: OparlTypeSpec,
    result: ExtractedObjects,
    depth: number,
  ): void {
    const nested = [
      ...spec.refs.map((r) => ({ source: r.source, type: r.target })),
      ...spec.joins.map((j) => ({ source: j.source, type: j.target })),
      ...spec.children.map((c) => ({
        source: c.source,
        type: c.type,
        parentRef: c.parentRef,
      })),
    ];
    for (const { source, type, parentRef } of nested as Array<{
      source: string;
      type: OparlEntityType;
      parentRef?: string;
    }>) {
      for (const item of asList(value[source])) {
        if (!isObject(item)) continue;
        this.collect(
          item,
          {
            type,
            embedded: true,
            parentRef,
            parentId: oparlId,
            depth: depth + 1,
          },
          result,
        );
      }
    }
  }

  private toMirrorObject(
    value: Json,
    oparlId: string,
    { type, embedded }: Visit,
    spec: OparlTypeSpec,
  ): MirrorObject {
    const fields: Record<string, OparlScalar> = {};
    for (const { field, kind } of spec.fields)
      fields[field] = SCALARS[kind](value[field]);
    const refs: Record<string, string | null> = {};
    for (const { ref, source } of spec.refs) refs[ref] = idOf(value[source]);
    const joins: Record<string, string[]> = {};
    for (const { relation, source } of spec.joins) {
      const ids = asList(value[source]).map(idOf);
      joins[relation] = [...new Set(ids.filter((id) => id !== null))];
    }
    return {
      type,
      oparlId,
      embedded,
      web: toText(value.web),
      oparlCreated: toDatetime(value.created),
      oparlModified: toDatetime(value.modified),
      raw: value,
      fields,
      refs,
      joins,
    };
  }
}
