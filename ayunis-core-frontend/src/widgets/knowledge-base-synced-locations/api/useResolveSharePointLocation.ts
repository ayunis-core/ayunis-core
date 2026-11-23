import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSharePointLocationsControllerResolve } from '@ayunis/api-client/endpoints';
import type { SharePointLocationResolutionResponseDto } from '@ayunis/api-client/schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError } from '@/shared/lib/toast';
import type { SharePointLocationFormValues } from '@/widgets/knowledge-base-synced-locations/model/sharePointLocationFormSchema';

function resolveErrorKey(code: string | undefined): string {
  if (code === 'CONNECTOR_NOT_SET_UP')
    return 'detail.syncedLocations.errors.notSetUp';
  if (code === 'CONNECTOR_CONNECTION_FAILED')
    return 'detail.syncedLocations.errors.connectionFailed';
  if (code?.startsWith('PROVIDER_UNAVAILABLE_'))
    return 'detail.syncedLocations.errors.microsoftUnavailable';
  return 'detail.syncedLocations.errors.resolve';
}

export interface SharePointResolution {
  /** The URL as it was checked. */
  url: string;
  result: SharePointLocationResolutionResponseDto;
}

export function useResolveSharePointLocation(
  form: UseFormReturn<SharePointLocationFormValues>,
) {
  const { t } = useTranslation('knowledge-bases');
  const [resolution, setResolution] = useState<SharePointResolution | null>(
    null,
  );
  const mutation = useSharePointLocationsControllerResolve({
    mutation: {
      onSuccess: (result, { data }) => setResolution({ url: data.url, result }),
      onError: (error: unknown) => {
        setResolution(null);
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(
              form,
              errors,
              t,
              'detail.syncedLocations.validation',
            );
          } else {
            showError(t(resolveErrorKey(code)));
          }
        } catch {
          showError(t('detail.syncedLocations.errors.resolve'));
        }
      },
    },
  });

  return {
    resolve: ({ url }: SharePointLocationFormValues) =>
      mutation.mutate({ data: { url } }),
    resolution,
    resetResolution: () => setResolution(null),
    isResolving: mutation.isPending,
  };
}
