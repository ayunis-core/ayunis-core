import { useCallback } from 'react';
import { useSsoLoginControllerDiscover } from '@ayunis/api-client/endpoints';
import type { SsoDiscoveryResponseDto } from '@ayunis/api-client/schemas';

export function useDiscoverSso() {
  const { mutateAsync, isPending } = useSsoLoginControllerDiscover({
    mutation: { retry: false },
  });

  const discover = useCallback(
    (email: string): Promise<SsoDiscoveryResponseDto> =>
      mutateAsync({ data: { email } }),
    [mutateAsync],
  );

  return { discover, isPending };
}
