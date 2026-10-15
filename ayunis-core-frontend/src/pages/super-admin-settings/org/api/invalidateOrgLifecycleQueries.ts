import type { QueryClient } from '@tanstack/react-query';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
} from '@/shared/api';

// The derived lifecycle status depends on subscriptions and trials, so their
// mutations must refresh the org detail and every cached list variant.
export function invalidateOrgLifecycleQueries(
  queryClient: QueryClient,
  orgId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(orgId),
  });
  void queryClient.invalidateQueries({
    queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
  });
}
