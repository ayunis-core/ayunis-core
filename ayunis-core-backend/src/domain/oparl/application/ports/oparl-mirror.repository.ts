import type { UUID } from 'crypto';
import type { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlTypeReconciliation } from 'src/domain/oparl/domain/oparl-reconciliation';
import type { OparlTypeCounts } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { MirrorObject } from 'src/domain/oparl/application/models/oparl-object';
import type { OparlBodySummary } from 'src/domain/oparl/application/models/oparl-body-summary';

export interface OparlMirrorScope {
  systemId: UUID;
  /** The body the objects were listed under; `null` for bodies themselves. */
  bodyId: UUID | null;
}

/**
 * The mirrored objects of all systems. Objects are upserted on their OParl
 * ID and keep their row ID for good; references are stored by OParl ID and
 * linked to rows as soon as the referenced object is mirrored.
 */
export abstract class OparlMirrorRepository {
  /**
   * Upserts objects of one type, at most one per OParl ID. A listed object
   * is written when its original or references changed or the row holds an
   * embedded form; an embedded one replaces a listed form only when its
   * `modified` is newer, so a differing embedded form never overwrites the
   * listed one. A listed location is written only as the place of
   * something mirrored. Returns the number written.
   */
  abstract write(
    scope: OparlMirrorScope,
    type: OparlEntityType,
    objects: MirrorObject[],
  ): Promise<number>;

  /** Removes objects with everything that depends on them. */
  abstract delete(
    systemId: UUID,
    type: OparlEntityType,
    oparlIds: string[],
  ): Promise<number>;

  /** Links stored references to the rows of objects mirrored since. */
  abstract linkReferences(systemId: UUID): Promise<void>;

  /** Records objects a full listing contained. */
  abstract markListed(
    runId: UUID,
    type: OparlEntityType,
    oparlIds: string[],
  ): Promise<void>;

  /**
   * Per type, its rows and how many removing what the run did not list
   * would remove, including what cascades from those.
   */
  abstract countUnlisted(
    systemId: UUID,
    runId: UUID,
  ): Promise<OparlTypeReconciliation[]>;

  abstract deleteUnlisted(
    systemId: UUID,
    runId: UUID,
  ): Promise<OparlTypeCounts>;

  abstract forgetListed(runIds: UUID[]): Promise<void>;

  abstract countByType(systemIds: UUID[]): Promise<Map<UUID, OparlTypeCounts>>;

  abstract findBodies(systemIds: UUID[]): Promise<OparlBodySummary[]>;
}
