import { Check } from 'typeorm';

/**
 * Exactly one owner per row: a user, a workspace, a team or the organization.
 * `orgId` is the row's tenant and is always set, so organization ownership is
 * the `isOrgOwned` flag rather than "no other owner".
 */
export function SingleOwnerCheck(tableName: string): ClassDecorator {
  return Check(
    `CHK_${tableName}_single_owner`,
    'num_nonnulls("userId", "workspaceId", "teamId") + "isOrgOwned"::int = 1',
  );
}
