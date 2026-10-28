import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
} from '@/shared/api';
import { invalidateOrgLifecycleQueries } from './invalidateOrgLifecycleQueries';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ORG_ID = '22222222-2222-2222-2222-222222222222';

describe(invalidateOrgLifecycleQueries.name, () => {
  it('marks the org detail and every cached org list stale', () => {
    const queryClient = new QueryClient();
    const detailKey = getSuperAdminOrgsControllerGetOrgByIdQueryKey(ORG_ID);
    const otherDetailKey =
      getSuperAdminOrgsControllerGetOrgByIdQueryKey(OTHER_ORG_ID);
    const listKey = getSuperAdminOrgsControllerGetAllOrgsQueryKey({
      lifecycle: 'paying',
    });
    for (const key of [detailKey, otherDetailKey, listKey]) {
      queryClient.setQueryData(key, {});
    }

    invalidateOrgLifecycleQueries(queryClient, ORG_ID);

    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherDetailKey)?.isInvalidated).toBe(
      false,
    );
  });
});
