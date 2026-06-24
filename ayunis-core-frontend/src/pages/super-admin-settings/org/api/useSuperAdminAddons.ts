import { useSuperAdminAddonsControllerList } from '@/shared/api';
import type { AddonStatusResponseDto } from '@/shared/api';

export function useSuperAdminAddons(orgId: string) {
  const { data, isLoading, isError } = useSuperAdminAddonsControllerList(orgId);

  const addons: AddonStatusResponseDto[] = data ?? [];

  return { addons, isLoading, isError };
}
