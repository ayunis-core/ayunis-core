import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useMfaLoginControllerVerify } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useVerifyMfa({ redirect }: { redirect?: string }) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const verifyMutation = useMfaLoginControllerVerify();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verify = (code: string) => {
    setErrorMessage(null);
    verifyMutation.mutate(
      { data: { code } },
      {
        onSuccess: () => {
          void navigate({ to: redirect || '/chat' });
        },
        onError: (error) => {
          try {
            const { code: errorCode } = extractErrorData(error);
            if (errorCode === 'INVALID_MFA_CODE') {
              setErrorMessage(t('twoFactor.error.invalidCode'));
            } else if (errorCode === 'MFA_LOCKED') {
              // The lock (15 min) outlives the pending token (5 min), so this
              // session can never succeed — send the user back to login.
              showError(t('twoFactor.error.locked'));
              void navigate({ to: '/login' });
            } else if (errorCode === 'MFA_PENDING_TOKEN_INVALID') {
              // The 5-minute login window expired — start over.
              showError(t('twoFactor.error.expired'));
              void navigate({ to: '/login' });
            } else {
              showError(t('twoFactor.error.unexpected'));
            }
          } catch {
            showError(t('twoFactor.error.unexpected'));
          }
        },
      },
    );
  };

  return {
    verify,
    isLoading: verifyMutation.isPending,
    errorMessage,
  };
}
