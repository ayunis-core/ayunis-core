import type { RemainingShareScope } from '../../events/share-deleted.event';

export class ResolveShareScopeUserIdsQuery {
  constructor(public readonly scopes: RemainingShareScope[]) {}
}
