import type { IndexEntry } from './index-entry.entity';

export class IndexMatch {
  readonly entry: IndexEntry;
  readonly matchedQueries: string[];

  constructor(params: { entry: IndexEntry; matchedQueries: string[] }) {
    this.entry = params.entry;
    this.matchedQueries = params.matchedQueries;
  }
}
