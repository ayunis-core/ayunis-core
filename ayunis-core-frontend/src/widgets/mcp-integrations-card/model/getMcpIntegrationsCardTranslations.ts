import type { TFunction } from 'i18next';

export function getMcpIntegrationsCardTranslations(t: TFunction) {
  return {
    title: t('mcpIntegrations.title'),
    description: t('mcpIntegrations.description'),
    failedToLoad: t('mcpIntegrations.errors.failedToLoad'),
    retryButton: t('mcpIntegrations.retryButton'),
    toggleAriaLabel: (name: string) =>
      t('mcpIntegrations.toggleAriaLabel', { name }),
    authorizationRequired: t('mcpIntegrations.authorizationRequired'),
    authorize: t('mcpIntegrations.authorize'),
    authorizing: t('mcpIntegrations.authorizing'),
    reauthorize: t('mcpIntegrations.oauth.reauthorize'),
    revoke: t('mcpIntegrations.oauth.revoke'),
    oauthErrorToast: t('mcpIntegrations.oauth.errorToast'),
    oauthErrorClientNotConfigured: t(
      'mcpIntegrations.oauth.errorClientNotConfigured',
    ),
    oauthErrorIntegrationNotFound: t(
      'mcpIntegrations.oauth.errorIntegrationNotFound',
    ),
    oauthRevokeSuccess: t('mcpIntegrations.oauth.revokeSuccess'),
    oauthRevokeError: t('mcpIntegrations.oauth.revokeError'),
  };
}
