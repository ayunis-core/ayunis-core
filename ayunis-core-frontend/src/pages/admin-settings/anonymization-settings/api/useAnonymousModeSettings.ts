import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useOrgChatSettingsControllerGetOrgChatSettings,
  useOrgChatSettingsControllerUpsertOrgChatSettings,
  getOrgChatSettingsControllerGetOrgChatSettingsQueryKey,
  getOrgChatSettingsControllerGetChatStartDefaultsQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useAnonymousModeSettings() {
  const { t } = useTranslation('admin-settings-anonymization');
  const queryClient = useQueryClient();
  const router = useRouter();
  const query = useOrgChatSettingsControllerGetOrgChatSettings();
  const mutation = useOrgChatSettingsControllerUpsertOrgChatSettings({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getOrgChatSettingsControllerGetOrgChatSettingsQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey:
              getOrgChatSettingsControllerGetChatStartDefaultsQueryKey(),
          }),
        ]);
        void router.invalidate();
        showSuccess(t('anonymousModeDefault.saved'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'UNAUTHORIZED_ACCESS') {
            showError(t('anonymousModeDefault.unauthorized'));
          } else {
            showError(t('anonymousModeDefault.saveError'));
          }
        } catch {
          showError(t('anonymousModeDefault.saveError'));
        }
      },
    },
  });
  return {
    isAnonymousByDefault: query.data?.anonymousModeByDefault ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isUpdating: mutation.isPending,
    setAnonymousByDefault: (anonymousModeByDefault: boolean) =>
      mutation.mutate({ data: { anonymousModeByDefault } }),
  };
}
