import { useCallback } from 'react';
import { useSsoLoginControllerDiscover } from '@/shared/api/generated/ayunisCoreAPI';
import type { SsoDiscoveryResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useDiscoverSso() {
  const { mutateAsync, isPending } = useSsoLoginControllerDiscover();

  const discover = useCallback(
    (email: string): Promise<SsoDiscoveryResponseDto> =>
      mutateAsync({ data: { email } }),
    [mutateAsync],
  );

  return { discover, isPending };
}
