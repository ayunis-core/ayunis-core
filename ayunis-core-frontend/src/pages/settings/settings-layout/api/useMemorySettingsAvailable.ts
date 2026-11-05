import {
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey,
  useOrgChatSettingsControllerGetChatStartDefaults,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Whether the organization has memory switched on. Until the answer arrives
 * the entry is treated as unavailable, so the sidebar never shows a link that
 * disappears a moment later.
 */
export function useMemorySettingsAvailable() {
  const { data, isLoading, error } =
    useOrgChatSettingsControllerGetChatStartDefaults({
      query: {
        queryKey: getOrgChatSettingsControllerGetChatStartDefaultsQueryKey(),
      },
    });

  return {
    isMemoryAvailable: data?.memoryEnabled === true,
    isLoading,
    error,
  };
}
