import { useSuperAdminAddonsControllerList } from '@ayunis/api-client';
import type { AddonStatusResponseDto } from '@ayunis/api-client';

export function useSuperAdminAddons(orgId: string) {
  const { data, isLoading, isError } = useSuperAdminAddonsControllerList(orgId);

  const addons: AddonStatusResponseDto[] = data ?? [];

  return { addons, isLoading, isError };
}
