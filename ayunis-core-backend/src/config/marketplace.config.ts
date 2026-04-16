import { registerAs } from '@nestjs/config';

/**
 * Parses `MARKETPLACE_SERVICE_URL` and returns it only if it is a valid
 * `http:` or `https:` URL. Anything else (undefined, malformed, or a
 * dangerous scheme like `javascript:`/`data:`) yields `undefined` so the
 * feature stays disabled and the value never reaches the browser.
 */
function parseServiceUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }
  return raw;
}

export const marketplaceConfig = registerAs('marketplace', () => {
  const serviceUrl = parseServiceUrl(process.env.MARKETPLACE_SERVICE_URL);
  return {
    serviceUrl,
    enabled: serviceUrl !== undefined,
  };
});
