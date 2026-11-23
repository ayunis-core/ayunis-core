import type { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';

/** An OParl object as received: identified by its URL, everything else optional. */
export interface OparlObject {
  id: string;
  type?: string;
  deleted?: boolean;
  [property: string]: unknown;
}

export interface OparlPage {
  data: unknown[];
  /** `links.next`; `null` on the last page. */
  nextUrl: string | null;
  totalElements: number | null;
}

export type OparlScalar = string | number | boolean | string[] | null;

/**
 * One object ready for the mirror: its columns, its references to other
 * objects by OParl ID (resolved to rows by the mirror) and its original.
 */
export interface MirrorObject {
  type: OparlEntityType;
  oparlId: string;
  /** Arrived inside another object rather than in a list of its own type. */
  embedded: boolean;
  web: string | null;
  oparlCreated: string | null;
  oparlModified: string | null;
  raw: Record<string, unknown>;
  fields: Record<string, OparlScalar>;
  refs: Record<string, string | null>;
  joins: Record<string, string[]>;
}

/** What one listed object amounts to: itself and what it embeds, or deletions. */
export interface ExtractedObjects {
  objects: MirrorObject[];
  deleted: Array<{ type: OparlEntityType; oparlId: string }>;
}
