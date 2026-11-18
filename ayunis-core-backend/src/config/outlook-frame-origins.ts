// Outlook on the web and the new Outlook for Windows render the task pane in
// an iframe on one of these origins. On-premises OWA hosts are added by
// listing them in OUTLOOK_ADDIN_FRAME_ORIGINS, which replaces this list.
const MICROSOFT_OUTLOOK_ORIGINS = [
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.cloud.microsoft',
  'https://outlook.live.com',
];

// Scheme, host and optional port only: no wildcard, path or CSP syntax can
// reach the frame-ancestors header.
const HTTPS_ORIGIN = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i;
const HTTP_OR_HTTPS_ORIGIN =
  /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i;

function splitOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function outlookFrameOrigins(value: string | undefined): string[] {
  const origins = splitOrigins(value ?? '');
  return origins.length > 0 ? origins : MICROSOFT_OUTLOOK_ORIGINS;
}

export function validateOutlookFrameOrigins(
  env: Record<string, unknown>,
): string[] {
  const value = env.OUTLOOK_ADDIN_FRAME_ORIGINS;
  if (value === undefined) {
    return [];
  }
  const isProduction = env.NODE_ENV === 'production';
  const pattern = isProduction ? HTTPS_ORIGIN : HTTP_OR_HTTPS_ORIGIN;
  if (
    typeof value === 'string' &&
    splitOrigins(value).every((o) => pattern.test(o))
  ) {
    return [];
  }
  return [
    `OUTLOOK_ADDIN_FRAME_ORIGINS must be a comma-separated list of ` +
      `${isProduction ? 'HTTPS ' : ''}origins (scheme, host and optional ` +
      `port; no wildcards or paths)`,
  ];
}
