import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ssoLoginControllerStartLink } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { navigateToExternalUrl } from '@/features/sso';

export function useStartSsoAccountLink() {
  const { t } = useTranslation('settings');
  return useMutation({
    mutationFn: () => ssoLoginControllerStartLink(),
    onSuccess: ({ authorizationUrl }) =>
      navigateToExternalUrl(authorizationUrl),
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'SSO_CONNECTION_NOT_AVAILABLE'
              ? 'account.sso.unavailable'
              : 'account.sso.error',
          ),
        );
      } catch {
        showError(t('account.sso.error'));
      }
    },
  });
}
