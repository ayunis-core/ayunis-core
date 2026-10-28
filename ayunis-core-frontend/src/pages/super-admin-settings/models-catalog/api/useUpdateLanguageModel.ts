import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminLanguageCatalogModelsControllerUpdateLanguageModel,
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getModelsControllerGetOrgPermittedLanguageModelsQueryKey,
  getModelsControllerGetAvailableLanguageModelsQueryKey,
  type UpdateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { resolveModelErrorToastKey } from '@/pages/super-admin-settings/models-catalog/lib/resolveModelErrorToastKey';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
export function useUpdateLanguageModel(
  form: UseFormReturn<LanguageModelFormData>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminLanguageCatalogModelsControllerUpdateLanguageModel({
      mutation: {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
            }),
            // Catalog edits change what users see in the model selector
            queryClient.invalidateQueries({
              queryKey: getModelsControllerGetPermittedLanguageModelsQueryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey:
                getModelsControllerGetOrgPermittedLanguageModelsQueryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: getModelsControllerGetAvailableLanguageModelsQueryKey(),
            }),
          ]);
          showSuccess(t('models.updateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors?.length) {
              setValidationErrors(form, errors, t, 'models.catalog.validation');
            } else {
              showError(
                t(resolveModelErrorToastKey(code, 'models.updateError')),
              );
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('models.updateError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function updateLanguageModel(
    id: string,
    data: UpdateLanguageModelRequestDto,
  ) {
    mutation.mutate({ id, data });
  }

  return {
    updateLanguageModel,
    isUpdating: mutation.isPending,
  };
}
