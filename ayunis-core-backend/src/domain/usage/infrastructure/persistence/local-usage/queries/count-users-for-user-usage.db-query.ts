import type { GetUserUsageQueryParams } from './usage-query.types';

// The report lists every user of the org (users without usage show zeros), so
// the total depends only on the users table, not on usage or the date range.
export async function countUsersForUserUsage(
  params: Omit<
    GetUserUsageQueryParams,
    'offset' | 'limit' | 'sortField' | 'sortOrder'
  >,
): Promise<number> {
  const qb = params.userRepository
    .createQueryBuilder('user')
    .where('user.orgId = :orgId', { orgId: params.organizationId.toString() });

  if (params.searchTerm) {
    qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
      search: `%${params.searchTerm}%`,
    });
  }

  return await qb.getCount();
}
