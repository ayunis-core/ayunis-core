import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBaseSyncedLocationsControllerListQueryKey,
  useKnowledgeBaseSyncedLocationsControllerAddWebsite,
} from '@ayunis/api-client/endpoints';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { WebsiteFormValues } from '@/widgets/knowledge-base-synced-locations/model/websiteFormSchema';

/** Errors about the URL itself, shown at the URL field. */
const URL_ERROR_KEYS: Partial<Record<string, string>> = {
  SYNCED_LOCATION_ALREADY_EXISTS:
    'detail.syncedLocations.website.errors.alreadyExists',
  CRAWL_DOMAIN_ACCESS_DENIED:
    'detail.syncedLocations.website.errors.domainNotAvailable',
  INVALID_SYNCED_LOCATION:
    'detail.syncedLocations.website.validation.url.isUrl',
};

export function useAddWebsite(
  knowledgeBaseId: string,
  form: UseFormReturn<WebsiteFormValues>,
  onAdded: () => void,
) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const mutation = useKnowledgeBaseSyncedLocationsControllerAddWebsite({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBaseSyncedLocationsControllerListQueryKey(
              knowledgeBaseId,
            ),
        });
        showSuccess(t('detail.syncedLocations.website.addSuccess'));
        onAdded();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          const urlErrorKey = code && URL_ERROR_KEYS[code];
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(
              form,
              errors,
              t,
              'detail.syncedLocations.website.validation',
            );
          } else if (urlErrorKey) {
            form.setError('url', { message: t(urlErrorKey) });
          } else if (code === 'KNOWLEDGE_BASE_NOT_FOUND') {
            showError(t('delete.notFound'));
          } else {
            showError(t('detail.syncedLocations.website.errors.add'));
          }
        } catch {
          showError(t('detail.syncedLocations.website.errors.add'));
        }
      },
    },
  });

  return {
    addWebsite: ({ url, maxDepth }: WebsiteFormValues) =>
      mutation.mutate({ id: knowledgeBaseId, data: { url, maxDepth } }),
    isAdding: mutation.isPending,
  };
}
