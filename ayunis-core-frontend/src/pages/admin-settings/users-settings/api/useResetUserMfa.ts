import { useMfaControllerResetUser } from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseResetUserMfaOptions {
  onSuccessCallback?: () => void;
}

export function useResetUserMfa(options?: UseResetUserMfaOptions) {
  const { t } = useTranslation('admin-settings-users');

  const mutation = useMfaControllerResetUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('resetMfa.success'));
        options?.onSuccessCallback?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'MFA_SELF_RESET_NOT_ALLOWED') {
            showError(t('resetMfa.errorSelf'));
          } else {
            showError(t('resetMfa.error'));
          }
        } catch {
          showError(t('resetMfa.error'));
        }
      },
    },
  });

  function resetUserMfa(userId: string) {
    mutation.mutate({ userId });
  }

  return {
    resetUserMfa,
    isLoading: mutation.isPending,
  };
}
