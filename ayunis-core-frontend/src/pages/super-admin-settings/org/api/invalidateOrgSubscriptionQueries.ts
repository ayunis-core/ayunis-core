import type { QueryClient } from '@tanstack/react-query';
import type { useRouter } from '@tanstack/react-router';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
} from '@/shared/api';

export function invalidateOrgSubscriptionQueries(
  queryClient: QueryClient,
  router: ReturnType<typeof useRouter>,
  orgId: string,
): void {
  const queryKeys = [
    getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(orgId),
    getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey(orgId),
    // Prefix key: every cached list variant shows paying status.
    getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
  ];
  queryKeys.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
  void router.invalidate();
}
