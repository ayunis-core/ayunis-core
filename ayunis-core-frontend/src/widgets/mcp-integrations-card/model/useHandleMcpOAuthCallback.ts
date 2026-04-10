import { useEffect } from 'react';
import type { TFunction } from 'i18next';
import { getMcpOAuthErrorKey } from '@/shared/lib/mcp-oauth';
import { showError, showSuccess } from '@/shared/lib/toast';

interface OAuthCallbackOptions {
  refetch?: () => void;
  keyPrefix?: string;
}

export function useHandleMcpOAuthCallback(
  t: TFunction,
  options: OAuthCallbackOptions = {},
): void {
  const { refetch, keyPrefix = 'mcpIntegrations.oauth' } = options;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthStatus = searchParams.get('oauth');
    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === 'success') {
      showSuccess(t(`${keyPrefix}.successToast`));
      refetch?.();
    } else if (oauthStatus === 'error') {
      showError(
        t(`${keyPrefix}.${getMcpOAuthErrorKey(searchParams.get('reason'))}`),
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
  }, [refetch, t, keyPrefix]);
}
