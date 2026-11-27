import type { QueryClient } from '@tanstack/react-query';
import {
  getAdventCalendarControllerGetCalendarQueryKey,
  getSuperAdminAdventCalendarControllerGetCalendarQueryKey,
} from '@ayunis/api-client';
import type {
  SuperAdminAdventCalendarDoorResponseDto,
  SuperAdminAdventCalendarResponseDto,
} from '@ayunis/api-client/schemas';

/** The super admin's own calendar view changes with every edit too. */
export function invalidateAdventCalendarQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: getSuperAdminAdventCalendarControllerGetCalendarQueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: getAdventCalendarControllerGetCalendarQueryKey(),
  });
}

/**
 * Puts the saved switch state into the cache right away: the switch is enabled
 * again as soon as the mutation settles, before the refetch lands.
 */
export function storeEnabled(queryClient: QueryClient, enabled: boolean) {
  queryClient.setQueryData<SuperAdminAdventCalendarResponseDto>(
    getSuperAdminAdventCalendarControllerGetCalendarQueryKey(),
    (calendar) => calendar && { ...calendar, enabled },
  );
  invalidateAdventCalendarQueries(queryClient);
}

/**
 * Puts the door the server returned into the cache right away, so the editor
 * that was just reset from it shows the same door (e.g. its new image) without
 * waiting for the refetch.
 */
export function storeSavedDoor(
  queryClient: QueryClient,
  door: SuperAdminAdventCalendarDoorResponseDto,
) {
  queryClient.setQueryData<SuperAdminAdventCalendarResponseDto>(
    getSuperAdminAdventCalendarControllerGetCalendarQueryKey(),
    (calendar) =>
      calendar && {
        ...calendar,
        doors: calendar.doors.map((saved) =>
          saved.day === door.day ? door : saved,
        ),
      },
  );
  invalidateAdventCalendarQueries(queryClient);
}
