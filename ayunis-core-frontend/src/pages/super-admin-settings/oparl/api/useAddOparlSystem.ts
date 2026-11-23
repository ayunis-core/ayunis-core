import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOparlSystemsControllerListQueryKey,
  useSuperAdminOparlSystemsControllerAdd,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import { addSystemErrorKey } from '@/pages/super-admin-settings/oparl/lib/add-system-error-key';
import type { AddOparlSystemFormFields } from '@/pages/super-admin-settings/oparl/model/types';

export function useAddOparlSystem(
  form: UseFormReturn<AddOparlSystemFormFields>,
) {
  const { t } = useTranslation('super-admin-settings-oparl');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useSuperAdminOparlSystemsControllerAdd({
    mutation: {
      onSuccess: (system) => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOparlSystemsControllerListQueryKey(),
        });
        form.reset();
        showSuccess(t('add.success', { name: system.name ?? system.url }));
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          const key = addSystemErrorKey(code);
          if (key) {
            form.setError('url', { message: t(key) });
          } else if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'add.validation');
          } else {
            showError(t('add.error'));
          }
        } catch {
          showError(t('add.error'));
        }
      },
    },
  });

  function addSystem(data: AddOparlSystemFormFields) {
    mutate({ data: { url: data.url.trim() } });
  }

  return { addSystem, isPending };
}
