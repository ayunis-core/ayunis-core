import {
  useOrgChatSettingsControllerGetOrgChatSettings,
  useOrgChatSettingsControllerUpsertOrgChatSettings,
  getOrgChatSettingsControllerGetOrgChatSettingsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpsertOrgChatSettingsDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useOrgChatSettings() {
  const { t } = useTranslation('admin-settings-instructions');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getOrgChatSettingsControllerGetOrgChatSettingsQueryKey();

  const {
    data: orgChatSettingsResponse,
    error,
    isError,
    isLoading,
    refetch,
  } = useOrgChatSettingsControllerGetOrgChatSettings();

  const upsertMutation = useOrgChatSettingsControllerUpsertOrgChatSettings({
    mutation: {
      onSuccess: (_result, { data }) => {
        showSuccess(
          data.memoryEnabled === undefined
            ? t('internetAccess.saved')
            : t('memory.saved'),
        );
      },
      onError: (_error, { data }) => {
        showError(
          data.memoryEnabled === undefined
            ? t('internetAccess.error')
            : t('memory.error'),
        );
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  function setInternetSearchEnabled(internetSearchEnabled: boolean) {
    const data: UpsertOrgChatSettingsDto = { internetSearchEnabled };
    return upsertMutation.mutate({ data });
  }

  function setMemoryEnabled(memoryEnabled: boolean) {
    const data: UpsertOrgChatSettingsDto = { memoryEnabled };
    return upsertMutation.mutate({ data });
  }

  return {
    internetSearchEnabled:
      orgChatSettingsResponse?.internetSearchEnabled ?? true,
    memoryEnabled: orgChatSettingsResponse?.memoryEnabled ?? false,
    isLoading,
    isError,
    error,
    refetch,
    isUpdating: upsertMutation.isPending,
    setInternetSearchEnabled,
    setMemoryEnabled,
  };
}
