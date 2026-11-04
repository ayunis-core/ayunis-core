import { useSsoAccountControllerGetStatus } from '@/shared/api';

export function useSsoAccountLinkStatus() {
  return useSsoAccountControllerGetStatus({ query: { staleTime: 0 } });
}
