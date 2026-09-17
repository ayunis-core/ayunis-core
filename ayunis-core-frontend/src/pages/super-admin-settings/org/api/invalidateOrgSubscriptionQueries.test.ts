import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
} from '@/shared/api';
import { invalidateOrgSubscriptionQueries } from './invalidateOrgSubscriptionQueries';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

describe(invalidateOrgSubscriptionQueries.name, () => {
  it('marks latest and history queries stale so the org loader refetches both', async () => {
    const queryClient = new QueryClient();
    const latestKey =
      getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(ORG_ID);
    const historyKey =
      getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey(
        ORG_ID,
      );
    queryClient.setQueryData(latestKey, { subscription: { id: 'latest' } });
    queryClient.setQueryData(historyKey, {
      subscriptions: [{ id: 'latest' }],
      activeCount: 1,
    });
    const router = { invalidate: vi.fn() };

    invalidateOrgSubscriptionQueries(queryClient, router as never, ORG_ID);

    expect(queryClient.getQueryState(latestKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
    expect(router.invalidate).toHaveBeenCalledOnce();
  });
});
