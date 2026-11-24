import { useSsoAccountControllerGetStatus } from '@ayunis/api-client';

export function useSsoAccountLinkStatus() {
  return useSsoAccountControllerGetStatus({ query: { staleTime: 0 } });
}
