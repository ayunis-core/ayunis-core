import { useTranslation } from 'react-i18next';
import { navigateToExternalUrl } from '@/features/sso/lib/sso-navigation';
import { useSsoLoginControllerStartLink } from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';

export function useStartSsoLink() {
  const { t } = useTranslation('settings');
  const mutation = useSsoLoginControllerStartLink();

  function startLink(): void {
    mutation.mutate(undefined, {
      onSuccess: ({ authorizationUrl }) =>
        navigateToExternalUrl(authorizationUrl),
      onError: () => showError(t('account.sso.linkError')),
    });
  }

  return { startLink, isPending: mutation.isPending };
}
