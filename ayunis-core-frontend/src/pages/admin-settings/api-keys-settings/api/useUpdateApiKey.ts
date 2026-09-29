import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import {
  useApiKeysControllerUpdateApiKey,
  getApiKeysControllerListApiKeysQueryKey,
  getCreditLimitsControllerGetApiKeyLimitsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateApiKeyDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { EditApiKeyFormValues } from '@/pages/admin-settings/api-keys-settings/model/editApiKeyFormSchema';

export function useUpdateApiKey(
  form: UseFormReturn<EditApiKeyFormValues>,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-api-keys');

  const mutation = useApiKeysControllerUpdateApiKey({
    mutation: {
      onSuccess: () => {
        showSuccess(t('apiKeys.editDialog.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'apiKeys.validation');
          } else if (code === 'API_KEY_EXPIRATION_IN_PAST') {
            showError(t('apiKeys.createApiKey.expirationInPast'));
          } else if (code === 'API_KEY_NOT_EDITABLE') {
            showError(t('apiKeys.editDialog.notEditable'));
          } else if (code === 'API_KEY_NOT_FOUND') {
            showError(t('apiKeys.editDialog.notFound'));
          } else {
            showError(t('apiKeys.editDialog.error'));
          }
        } catch {
          showError(t('apiKeys.editDialog.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getApiKeysControllerListApiKeysQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetApiKeyLimitsQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function updateApiKey(id: string, data: UpdateApiKeyDto) {
    mutation.mutate({ id, data });
  }

  return {
    updateApiKey,
    isUpdating: mutation.isPending,
  };
}
