import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import {
  useSuperAdminPlatformConfigControllerSetAppAlert,
  getAppAlertControllerGetAppAlertQueryKey,
} from '@/shared/api';
import type { AppAlertFormFields } from '../model/types';

export default function useSetAppAlert(
  form: UseFormReturn<AppAlertFormFields>,
  onSuccessCallback?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-app-alerts');
  const queryClient = useQueryClient();

  const { mutate, isPending } =
    useSuperAdminPlatformConfigControllerSetAppAlert({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getAppAlertControllerGetAppAlertQueryKey(),
          });
          showSuccess(t('toast.updateSuccess'));
          onSuccessCallback?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'validation');
            } else {
              showError(t('toast.updateError'));
            }
          } catch {
            showError(t('toast.updateError'));
          }
        },
      },
    });

  function setAppAlert(data: AppAlertFormFields) {
    mutate({ data: { enabled: data.enabled, message: data.message } });
  }

  return { setAppAlert, isPending };
}
