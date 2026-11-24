import type { UUID } from 'crypto';
import type { OparlSearchFilters } from 'src/domain/oparl/application/models/oparl-search';

export class SearchOparlQuery {
  constructor(
    readonly queries: string[],
    /** Only these of the org's linked bodies; all of them when empty. */
    readonly bodyIds: UUID[],
    readonly filters: OparlSearchFilters,
  ) {}
}
