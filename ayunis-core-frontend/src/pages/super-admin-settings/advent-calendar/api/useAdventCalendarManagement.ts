import { useSuperAdminAdventCalendarControllerGetCalendar } from '@ayunis/api-client';

export function useAdventCalendarManagement() {
  const { data, isLoading, isError } =
    useSuperAdminAdventCalendarControllerGetCalendar();

  return {
    calendar: data,
    isLoading,
    isError,
  };
}
