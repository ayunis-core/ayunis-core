import type { UUID } from 'crypto';
import type { OparlBodySummary } from './oparl-body-summary';

/** A body of the catalog as an org admin sees it: whether their own org linked it, nothing about other orgs. */
export interface OparlCatalogBody extends OparlBodySummary {
  systemName: string | null;
  /** When the org linked the body; `null` if it did not. */
  linkedAt: Date | null;
}

export interface OparlLinkedBody extends OparlBodySummary {
  systemName: string | null;
  linkedAt: Date;
}

export interface OparlLinkingOrg {
  id: UUID;
  name: string;
  linkedAt: Date;
}
