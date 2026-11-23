import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminEmbeddingCatalogModelsControllerUpdateEmbeddingModel,
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey,
  type UpdateEmbeddingModelRequestDto,
} from '@ayunis/api-client';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { resolveModelErrorToastKey } from '@/pages/super-admin-settings/models-catalog/lib/resolveModelErrorToastKey';
import type { EmbeddingModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';

const VECTOR_FIELDS = ['name', 'dimensions'];

function inUseFieldErrors(metadata?: Record<string, unknown>) {
  const fields: unknown[] = Array.isArray(metadata?.fields)
    ? metadata.fields
    : [];
  return fields
    .filter(
      (field): field is string =>
        typeof field === 'string' && VECTOR_FIELDS.includes(field),
    )
    .map((field) => ({ field, constraints: ['embeddingModelInUse'] }));
}

export function useUpdateEmbeddingModel(
  form: UseFormReturn<EmbeddingModelFormData>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminEmbeddingCatalogModelsControllerUpdateEmbeddingModel({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey(),
          });
          showSuccess(t('models.updateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          console.error('Update embedding model failed:', error);
          try {
            const { code, metadata } = extractErrorData(error);
            const fieldErrors = inUseFieldErrors(metadata);
            if (code === 'EMBEDDING_MODEL_IN_USE' && fieldErrors.length) {
              setValidationErrors(
                form,
                fieldErrors,
                t,
                'models.catalog.validation',
              );
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

  function updateEmbeddingModel(
    id: string,
    data: UpdateEmbeddingModelRequestDto,
  ) {
    mutation.mutate({ id, data });
  }

  return {
    updateEmbeddingModel,
    isUpdating: mutation.isPending,
  };
}
