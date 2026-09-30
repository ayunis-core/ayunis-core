import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  orgChatSettingsControllerGetChatStartDefaults,
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey,
} from '@/shared/api';

export function anonymousModeDefaultQueryOptions() {
  return queryOptions({
    queryKey: getOrgChatSettingsControllerGetChatStartDefaultsQueryKey(),
    queryFn: ({ signal }) =>
      orgChatSettingsControllerGetChatStartDefaults(signal),
    staleTime: 0,
  });
}

export function useAnonymousModeDefault() {
  const { data } = useSuspenseQuery(anonymousModeDefaultQueryOptions());
  return { isAnonymousByDefault: data.anonymousModeByDefault };
}
