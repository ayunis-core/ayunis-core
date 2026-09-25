export type MarketplaceCatalogueEntryType = 'skill' | 'integration';

export interface MarketplaceCatalogueEntry {
  type: MarketplaceCatalogueEntryType;
  identifier: string;
  name: string;
  shortDescription: string;
  category: string | null;
  featured: boolean;
}
