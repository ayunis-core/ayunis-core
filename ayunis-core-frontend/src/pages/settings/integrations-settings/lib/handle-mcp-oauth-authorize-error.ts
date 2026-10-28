import type { TFunction } from 'i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export default function handleMcpOAuthAuthorizeError(
  error: unknown,
  t: TFunction,
): void {
  try {
    const { code } = extractErrorData(error);
    switch (code) {
      case 'MCP_INTEGRATION_NOT_FOUND':
        showError(t('integrations.oauth.notFound'));
        break;
      // Both describe a broken upstream server; retrying cannot help, and the
      // person clicking Connect is usually not the admin who configured it.
      case 'MCP_OAUTH_SERVER_UNREACHABLE':
      case 'MCP_OAUTH_INVALID_RESPONSE':
        showError(t('integrations.oauth.serverError'));
        break;
      default:
        showError(t('integrations.oauth.connectError'));
    }
  } catch {
    showError(t('integrations.oauth.connectError'));
  }
}
