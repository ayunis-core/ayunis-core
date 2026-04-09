import { useEffect } from 'react';
import type { TFunction } from 'i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import { getOAuthErrorMessage } from '@/shared/lib/mcp-oauth';

export function useHandleMcpOAuthCallback(
  t: TFunction,
  refetch: () => void,
): void {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthStatus = searchParams.get('oauth');
    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === 'success') {
      showSuccess(t('mcpIntegrations.oauth.successToast'));
      refetch();
    } else if (oauthStatus === 'error') {
      showError(
        getOAuthErrorMessage(
          t,
          searchParams.get('reason'),
          'mcpIntegrations.oauth.',
        ),
      );
    }

    searchParams.delete('oauth');
    searchParams.delete('id');
    searchParams.delete('reason');

    const cleanedSearch = searchParams.toString();
    const searchSuffix = cleanedSearch ? `?${cleanedSearch}` : '';
    const cleanedUrl =
      window.location.pathname + searchSuffix + window.location.hash;
    window.history.replaceState({}, '', cleanedUrl);
  }, [refetch, t]);
}
