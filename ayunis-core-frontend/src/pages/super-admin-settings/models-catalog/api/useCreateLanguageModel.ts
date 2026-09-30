import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminLanguageCatalogModelsControllerCreateLanguageModel,
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getModelsControllerGetOrgPermittedLanguageModelsQueryKey,
  getModelsControllerGetAvailableLanguageModelsQueryKey,
  type CreateLanguageModelRequestDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { resolveModelErrorToastKey } from '@/pages/super-admin-settings/models-catalog/lib/resolveModelErrorToastKey';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
export function useCreateLanguageModel(
  form: UseFormReturn<LanguageModelFormData>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminLanguageCatalogModelsControllerCreateLanguageModel({
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
          showSuccess(t('models.createSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors?.length) {
              setValidationErrors(form, errors, t, 'models.catalog.validation');
            } else {
              showError(
                t(resolveModelErrorToastKey(code, 'models.createError')),
              );
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('models.createError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function createLanguageModel(data: CreateLanguageModelRequestDto) {
    mutation.mutate({ data });
  }

  return {
    createLanguageModel,
    isCreating: mutation.isPending,
  };
}
