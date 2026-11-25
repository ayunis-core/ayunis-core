import type { UUID } from 'crypto';
import type {
  OparlListFilters,
  OparlListType,
} from 'src/domain/oparl/application/models/oparl-read';

export class ListOparlObjectsQuery {
  constructor(
    readonly type: OparlListType,
    /** Only these of the org's linked bodies; all of them when empty. */
    readonly bodyIds: UUID[],
    readonly filters: OparlListFilters,
    /** 1-based. */
    readonly page: number,
  ) {}
}
