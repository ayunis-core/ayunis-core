import { queryOptions } from '@tanstack/react-query';
import {
  orgChatSettingsControllerGetChatStartDefaults,
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey,
} from '@ayunis/api-client';

export function anonymousModeDefaultQueryOptions() {
  return queryOptions({
    queryKey: getOrgChatSettingsControllerGetChatStartDefaultsQueryKey(),
    queryFn: ({ signal }) =>
      orgChatSettingsControllerGetChatStartDefaults(signal),
    staleTime: 0,
  });
}
