import type { UUID } from 'crypto';
import type { OparlBodyLink } from 'src/domain/oparl/domain/oparl-body-link.entity';
import type {
  OparlCatalogBody,
  OparlLinkedBody,
  OparlLinkingOrg,
} from 'src/domain/oparl/application/models/oparl-linked-body';

export abstract class OparlBodyLinksRepository {
  /** Every body of the catalog, with the org's own link if any. */
  abstract findCatalog(orgId: UUID): Promise<OparlCatalogBody[]>;

  abstract findLinked(orgId: UUID): Promise<OparlLinkedBody[]>;

  /**
   * Adds the links; one the org already has stays as it is. `false` when a
   * body does not exist, and then nothing is linked.
   */
  abstract link(links: OparlBodyLink[]): Promise<boolean>;

  /** `false` when the org has not linked the body. */
  abstract unlink(orgId: UUID, bodyId: UUID): Promise<boolean>;

  /** The orgs that linked each of the bodies, by body ID. */
  abstract findLinkingOrgs(
    bodyIds: UUID[],
  ): Promise<Map<UUID, OparlLinkingOrg[]>>;
}
