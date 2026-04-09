import { useEffect } from 'react';
import type { TFunction } from 'i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

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
      showError(getOAuthErrorMessage(t, searchParams.get('reason')));
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

function getOAuthErrorMessage(t: TFunction, reason: string | null): string {
  if (!reason) {
    return t('mcpIntegrations.oauth.errorToast');
  }

  const normalizedReason = reason.toLowerCase();
  if (normalizedReason.includes('state')) {
    return t('mcpIntegrations.oauth.errorState');
  }
  if (normalizedReason.includes('exchange')) {
    return t('mcpIntegrations.oauth.errorOauthExchange');
  }
  if (normalizedReason.includes('client credentials')) {
    return t('mcpIntegrations.oauth.errorClientNotConfigured');
  }

  return t('mcpIntegrations.oauth.errorToast');
}
