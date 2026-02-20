import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { RunErrorResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getThreadsControllerFindOneQueryKey,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';

export function useRunErrorHandler(threadId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useCallback(
    (error: RunErrorResponseDto) => {
      switch (error.code) {
        case 'EXECUTION_ERROR':
          showError(t('chat.errorExecutionError'));
          break;
        case 'RUN_NO_MODEL_FOUND':
          showError(t('chat.errorNoModelFound'));
          break;
        case 'RUN_MAX_ITERATIONS_REACHED':
          showError(t('chat.errorMaxIterationsReached'));
          break;
        case 'RUN_TOOL_NOT_FOUND':
          showError(t('chat.errorToolNotFound'));
          break;
        case 'RUN_ANONYMIZATION_UNAVAILABLE':
          showError(t('chat.errorAnonymizationUnavailable'));
          break;
        case 'THREAD_AGENT_NO_LONGER_ACCESSIBLE':
          void queryClient.invalidateQueries({
            queryKey: getAgentsControllerFindAllQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getThreadsControllerFindOneQueryKey(threadId),
          });
          showError(t('chat.unavailableAgentWarningTitle'));
          break;
        case 'QUOTA_EXCEEDED': {
          const retryMinutes = error.details?.retryAfterSeconds
            ? Math.ceil(Number(error.details.retryAfterSeconds) / 60)
            : null;
          showError(
            retryMinutes
              ? t('chat.errorQuotaExceededWithTime', { minutes: retryMinutes })
              : t('chat.errorQuotaExceeded'),
          );
          break;
        }
        case undefined:
        default:
          showError(t('chat.errorUnexpected'));
      }
    },
    [t, queryClient, threadId],
  );
}
