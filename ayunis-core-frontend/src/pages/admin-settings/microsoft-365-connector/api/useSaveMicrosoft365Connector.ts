import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  useConnectorsControllerSaveMicrosoft365,
  getConnectorsControllerGetMicrosoft365QueryKey,
  getConnectorsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { ShowConnectionTest } from '@/pages/admin-settings/microsoft-365-connector/lib/useLatestConnectionTest';
import type { Microsoft365ConnectorFormValues } from '@/pages/admin-settings/microsoft-365-connector/model/microsoft365ConnectorFormSchema';
import {
  toMicrosoft365ConnectorFormValues,
  toSaveMicrosoft365ConnectorDto,
} from '@/pages/admin-settings/microsoft-365-connector/lib/microsoft-365-connector-form';

export function useSaveMicrosoft365Connector(
  form: UseFormReturn<Microsoft365ConnectorFormValues>,
  startRequest: () => ShowConnectionTest,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-connections');

  const mutation = useConnectorsControllerSaveMicrosoft365({
    mutation: {
      onMutate: startRequest,
      onSuccess: (
        { connectionTest, ...connector },
        _variables,
        showConnectionTest,
      ) => {
        queryClient.setQueryData(
          getConnectorsControllerGetMicrosoft365QueryKey(),
          connector,
        );
        form.reset(toMicrosoft365ConnectorFormValues(connector));
        showConnectionTest(connectionTest);
        showSuccess(t('microsoft365.save.success'));
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'microsoft365.validation');
          } else if (code === 'CONNECTOR_CREDENTIALS_REQUIRED') {
            form.setError('clientSecret', {
              message: t('microsoft365.validation.clientSecret.required'),
            });
          } else {
            showError(t('microsoft365.save.error'));
          }
        } catch {
          showError(t('microsoft365.save.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getConnectorsControllerGetMicrosoft365QueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getConnectorsControllerListQueryKey(),
        });
      },
    },
  });

  function saveConnector(values: Microsoft365ConnectorFormValues) {
    mutation.mutate({ data: toSaveMicrosoft365ConnectorDto(values) });
  }

  return { saveConnector, isSaving: mutation.isPending };
}
