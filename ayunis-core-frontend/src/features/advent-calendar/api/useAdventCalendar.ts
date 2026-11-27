import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  adventCalendarControllerGetCalendar,
  getAdventCalendarControllerGetCalendarQueryKey,
} from '@ayunis/api-client';

export function adventCalendarQueryOptions() {
  return queryOptions({
    queryKey: getAdventCalendarControllerGetCalendarQueryKey(),
    queryFn: ({ signal }) => adventCalendarControllerGetCalendar(signal),
  });
}

export function useAdventCalendar() {
  const { data, dataUpdatedAt, isLoading, error, refetch } = useQuery(
    adventCalendarQueryOptions(),
  );
  return {
    calendar: data,
    /** Users see it in season with the switch on; super admins always. */
    isShown: Boolean(data && (data.visible || data.preview)),
    /** When this browser received `calendar`, to tell the server's clock from its own. */
    receivedAt: dataUpdatedAt,
    isLoading,
    error,
    refetch,
  };
}
