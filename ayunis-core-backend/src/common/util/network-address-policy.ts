import type { LookupOptions } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP, type LookupFunction } from 'node:net';

type AddressRecord = { address: string; family: 4 | 6 };

export function normalizeHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

export async function resolveHostnameAddresses(
  hostname: string,
): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  return (await lookup(hostname, { all: true, verbatim: true })).map(
    ({ address }) => address,
  );
}

export function connectionAddressRecords(
  addresses: string[],
  family: LookupOptions['family'],
): AddressRecord[] {
  const requested = normalizeFamily(family);
  return addresses
    .map((address) => ({ address, family: isIP(address) as 4 | 6 }))
    .filter((record) => !requested || record.family === requested);
}

function normalizeFamily(family: LookupOptions['family']): 4 | 6 | undefined {
  if (family === 4 || family === 'IPv4') return 4;
  if (family === 6 || family === 'IPv6') return 6;
  return undefined;
}

export function createConnectionLookup(
  resolve: (
    hostname: string,
    options: LookupOptions,
  ) => Promise<AddressRecord[]>,
  fallbackMessage = 'DNS lookup failed',
): LookupFunction {
  return (hostname, options, callback) => {
    void resolve(hostname, options).then(
      (addresses) => {
        if (options.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      },
      (error: unknown) =>
        callback(
          error instanceof Error ? error : new Error(fallbackMessage),
          '',
          0,
        ),
    );
  };
}

export function isBlockedNetworkAddress(
  address: string,
  blocked: BlockList,
): boolean {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, 'ipv4');
  if (family === 6) return blocked.check(address, 'ipv6');
  return true;
}

export function buildBlockedAddresses(): BlockList {
  const blockList = new BlockList();
  /* eslint-disable sonarjs/no-hardcoded-ip -- SSRF protection requires literal special-purpose network ranges. */
  const ipv4Subnets: Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ];
  const ipv6Subnets: Array<[string, number]> = [
    ['::', 128],
    ['::1', 128],
    ['100::', 64],
    ['2001::', 32],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
  ];
  /* eslint-enable sonarjs/no-hardcoded-ip */
  for (const [address, prefix] of ipv4Subnets) {
    blockList.addSubnet(address, prefix, 'ipv4');
  }
  for (const [address, prefix] of ipv6Subnets) {
    blockList.addSubnet(address, prefix, 'ipv6');
  }
  return blockList;
}

export function withAbortSignal<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) return Promise.reject(abortedUrlError());
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortedUrlError());
    signal.addEventListener('abort', abort, { once: true });
    void Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

function abortedUrlError(): Error {
  const error = new Error('URL retrieval aborted');
  error.name = 'AbortError';
  return error;
}
