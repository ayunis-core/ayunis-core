import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  orgChatSettingsControllerGetChatStartDefaults,
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey,
} from '@/shared/api';

/**
 * Whether the user's organization has turned memory on. Served by the
 * member-readable chat-start defaults, so a non-admin can also tell.
 */
export function memoryEnabledQueryOptions() {
  return queryOptions({
    queryKey: getOrgChatSettingsControllerGetChatStartDefaultsQueryKey(),
    queryFn: ({ signal }) =>
      orgChatSettingsControllerGetChatStartDefaults(signal),
  });
}

export function useMemoryEnabled(): boolean {
  const { data } = useQuery(memoryEnabledQueryOptions());
  // Default off while loading, so a declined feature never flashes into view.
  return data?.memoryEnabled ?? false;
}
