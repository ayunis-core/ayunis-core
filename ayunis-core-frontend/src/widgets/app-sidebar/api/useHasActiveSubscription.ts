import { useSubscriptionsControllerHasActiveSubscription } from '@/shared/api';

export function useHasActiveSubscription() {
  const { data, isLoading, error } =
    useSubscriptionsControllerHasActiveSubscription({
      query: {
        queryKey: ['subscription'],
      },
    });

  return {
    hasSubscription: data?.hasActiveSubscription ?? false,
    isLoading,
    error,
  };
}
