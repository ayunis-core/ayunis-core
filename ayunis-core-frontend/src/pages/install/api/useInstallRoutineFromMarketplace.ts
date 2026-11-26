import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  useRoutinesControllerInstallFromMarketplace,
} from '@ayunis/api-client/endpoints';
import extractErrorData from '@/shared/api/extract-error-data';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { showError, showSuccess } from '@/shared/lib/toast';

const ERROR_MESSAGES: Record<string, string> = {
  MARKETPLACE_ROUTINE_NOT_FOUND: 'error.notFound.description',
  MARKETPLACE_UNAVAILABLE: 'error.unavailable.description',
  UNAUTHORIZED_ACCESS: 'error.noPermission.description',
  ROUTINE_INVALID_SCHEDULE: 'error.invalidEntry',
  ROUTINE_INVALID_ALLOWED_DOMAINS: 'error.invalidEntry',
  ROUTINE_INVALID_MARKETPLACE_ENTRY: 'error.invalidEntry',
};

export function useInstallRoutineFromMarketplace() {
  const { t } = useTranslation('install-routine');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useRoutinesControllerInstallFromMarketplace({
    mutation: {
      onSuccess: (routine, { data }) => {
        trackOpenPanelEvent('routine_installed', {
          marketplace_slug: data.identifier,
        });
        showSuccess(t('success'));
        void queryClient.invalidateQueries({
          queryKey: getRoutinesControllerFindAllQueryKey(),
        });
        void router.navigate({
          to: '/routines/$routineId',
          params: { routineId: routine.id },
        });
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_MESSAGES[code] ?? 'error.generic'));
        } catch {
          showError(t('error.generic'));
        }
      },
    },
  });
}
