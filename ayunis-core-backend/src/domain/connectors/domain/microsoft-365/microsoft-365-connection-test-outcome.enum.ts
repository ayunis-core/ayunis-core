export enum Microsoft365ConnectionTestOutcome {
  CONNECTED = 'connected',
  TENANT_NOT_FOUND = 'tenant_not_found',
  CLIENT_NOT_FOUND = 'client_not_found',
  CLIENT_SECRET_INVALID = 'client_secret_invalid',
  CLIENT_SECRET_EXPIRED = 'client_secret_expired',
  /** No application permissions on Microsoft Graph or SharePoint. */
  CONSENT_MISSING = 'consent_missing',
  /** Application permissions on the SharePoint API instead of Microsoft Graph. */
  CONSENT_ON_WRONG_API = 'consent_on_wrong_api',
  REQUIRED_PERMISSION_MISSING = 'required_permission_missing',
  /** Entra refused the token for a reason not listed above. */
  REJECTED = 'rejected',
  MICROSOFT_UNAVAILABLE = 'microsoft_unavailable',
  /** The test itself failed, e.g. on a token Ayunis could not read. */
  UNEXPECTED_ERROR = 'unexpected_error',
}
