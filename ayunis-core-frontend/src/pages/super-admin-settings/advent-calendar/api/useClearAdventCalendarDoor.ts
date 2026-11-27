import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSuperAdminAdventCalendarControllerClearDoor } from '@ayunis/api-client';
import { showError, showSuccess } from '@/shared/lib/toast';
import { storeSavedDoor } from './adventCalendarQueryCache';

export function useClearAdventCalendarDoor(day: number, onCleared: () => void) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useSuperAdminAdventCalendarControllerClearDoor({
    mutation: {
      onSuccess: () => {
        storeSavedDoor(queryClient, { day, content: null });
        onCleared();
        showSuccess(t('toast.cleared', { day }));
      },
      onError: () => {
        // The endpoint has no error codes of its own to tell apart.
        showError(t('toast.clearError', { day }));
      },
    },
  });

  return { clearDoor: () => mutate({ day }), isClearing: isPending };
}
