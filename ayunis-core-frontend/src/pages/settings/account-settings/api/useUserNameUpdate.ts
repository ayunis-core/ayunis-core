import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  getAuthenticationControllerMeQueryKey,
  useUserControllerUpdateUserName,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  updateUserNameFormSchema,
  type UpdateUserNameFormValues,
} from '../model/updateUserNameSchema';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

export function useUserNameUpdate(currentName: string) {
  const { t } = useTranslation('settings');
  const updateMutation = useUserControllerUpdateUserName();
  const queryClient = useQueryClient();

  const form = useForm<UpdateUserNameFormValues>({
    resolver: zodResolver(updateUserNameFormSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const onSubmit = (values: UpdateUserNameFormValues) => {
    updateMutation.mutate(
      {
        data: {
          name: values.name,
        },
      },
      {
        onSuccess: () => {
          showSuccess(t('account.nameUpdatedSuccessfully'));
          void queryClient.invalidateQueries({
            queryKey: getAuthenticationControllerMeQueryKey(),
          });
        },
        onError: (error) => {
          console.error('Username update failed:', error);
          const { code } = extractErrorData(error);
          switch (code) {
            case 'VALIDATION_ERROR':
              showError(t('account.error.invalidName'));
              break;
            default:
              showError(t('account.error.updateFailed'));
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isUpdating: updateMutation.isPending,
  };
}
