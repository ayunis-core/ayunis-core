import type { UUID } from 'crypto';
import type { WhereExpressionBuilder } from 'typeorm';

/** Omitting `orgId` leaves org-owned rows out. */
export interface CollectiveOwnerFilter {
  orgId?: UUID;
  teamIds: UUID[];
}

/**
 * Restricts a query on a table declared with `@SingleOwnerCheck` to rows owned
 * by the given teams or organization. Org ownership is always tied to the
 * organization ID, so a query without its own tenant filter can never reach
 * another organization.
 */
export function whereCollectiveOwner(
  query: WhereExpressionBuilder,
  alias: string,
  owners: CollectiveOwnerFilter,
): WhereExpressionBuilder {
  query.where(`${alias}.isOrgOwned = true AND ${alias}.orgId = :ownerOrgId`, {
    ownerOrgId: owners.orgId ?? null,
  });
  if (owners.teamIds.length > 0) {
    query.orWhere(`${alias}.teamId IN (:...ownerTeamIds)`, {
      ownerTeamIds: owners.teamIds,
    });
  }
  return query;
}
