import { useSubscriptionsControllerGetStatus } from "@/shared/api";

export function useSubscriptionStatus() {
  return useSubscriptionsControllerGetStatus();
}

