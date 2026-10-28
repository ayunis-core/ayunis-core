import { isIP } from 'node:net';

export type TrustProxy = false | number | string[];

const INVALID_TRUST_PROXY =
  'TRUST_PROXY must be a non-negative safe integer hop count or a comma-separated list of proxy IPs/CIDRs';

// Express accepts distinct setting types for disabled trust, hops and IP ranges.
// eslint-disable-next-line sonarjs/function-return-type
export function parseTrustProxy(value: string | undefined): TrustProxy {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '0') {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    if (Number.isSafeInteger(hops)) {
      return hops || false;
    }
    throw new Error(INVALID_TRUST_PROXY);
  }
  const proxies = trimmed.split(',').map((proxy) => proxy.trim());
  if (!proxies.every(isProxyAddress)) {
    throw new Error(INVALID_TRUST_PROXY);
  }
  return proxies;
}

function isProxyAddress(value: string): boolean {
  const parts = value.split('/');
  const prefix = parts.at(1);
  const version = isIP(parts[0]);
  if (version === 0 || parts.length > 2) {
    return false;
  }
  if (prefix === undefined) {
    return true;
  }
  return (
    /^\d+$/.test(prefix) &&
    Number(prefix) > 0 &&
    Number(prefix) <= (version === 4 ? 32 : 128)
  );
}

export function validateTrustProxy(value: unknown): string[] {
  if (value !== undefined && typeof value !== 'string') {
    return [INVALID_TRUST_PROXY];
  }
  try {
    parseTrustProxy(value);
    return [];
  } catch {
    return [INVALID_TRUST_PROXY];
  }
}
