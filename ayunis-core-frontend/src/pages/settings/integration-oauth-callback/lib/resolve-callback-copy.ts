export type OAuthCallbackStatus = 'pending' | 'success' | 'error';

export function resolveOAuthCallbackCopy(status: OAuthCallbackStatus) {
  if (status === 'success') {
    return {
      title: 'integrations.oauth.callback.successTitle',
      description: 'integrations.oauth.callback.successDescription',
    } as const;
  }
  if (status === 'error') {
    return {
      title: 'integrations.oauth.callback.errorTitle',
      description: 'integrations.oauth.callback.errorDescription',
    } as const;
  }
  return {
    title: 'integrations.oauth.callback.pendingTitle',
    description: 'integrations.oauth.callback.pendingDescription',
  } as const;
}
