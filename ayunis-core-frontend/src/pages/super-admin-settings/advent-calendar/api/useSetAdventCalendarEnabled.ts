import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSuperAdminAdventCalendarControllerSetEnabled } from '@ayunis/api-client';
import { showError, showSuccess } from '@/shared/lib/toast';
import { storeEnabled } from './adventCalendarQueryCache';

export function useSetAdventCalendarEnabled() {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useSuperAdminAdventCalendarControllerSetEnabled(
    {
      mutation: {
        onSuccess: ({ enabled }) => {
          storeEnabled(queryClient, enabled);
          showSuccess(t(enabled ? 'toast.enabled' : 'toast.disabled'));
        },
        onError: () => {
          // The endpoint has no error codes of its own to tell apart.
          showError(t('toast.enabledError'));
        },
      },
    },
  );

  function setEnabled(enabled: boolean) {
    mutate({ data: { enabled } });
  }

  return { setEnabled, isPending };
}
