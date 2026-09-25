import type { MarketplaceCatalogueEntryType } from 'src/domain/marketplace/application/models/marketplace-catalogue-entry';

export class ListMarketplaceCatalogueQuery {
  /** Restrict to one entry type; both types when omitted. */
  public readonly type?: MarketplaceCatalogueEntryType;

  constructor(params: { type?: MarketplaceCatalogueEntryType } = {}) {
    this.type = params.type;
  }
}
