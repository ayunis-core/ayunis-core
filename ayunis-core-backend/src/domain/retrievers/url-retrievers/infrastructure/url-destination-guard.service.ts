import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { LookupOptions } from 'node:dns';
import type { BlockList } from 'node:net';
import { Agent, type Dispatcher } from 'undici';
import {
  buildBlockedAddresses,
  connectionAddressRecords,
  createConnectionLookup,
  isBlockedNetworkAddress,
  normalizeHostname,
  resolveHostnameAddresses,
  withAbortSignal,
} from 'src/common/util/network-address-policy';
import { UrlRetrieverRetrievalError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';

@Injectable()
export class UrlDestinationGuardService implements OnModuleDestroy {
  private readonly blockedAddresses = buildDiscoveredPdfBlockedAddresses();
  // This pool can never inherit an approved intranet connection from native fetch.
  private readonly publicDispatcher = new Agent({
    connect: {
      lookup: createConnectionLookup((host, options) =>
        this.connectionAddresses(host, options),
      ),
    },
  });

  async dispatcherFor(
    url: string,
    assertPrivateAccess: (url: string) => Promise<void>,
    signal: AbortSignal,
  ): Promise<Dispatcher | undefined> {
    const host = normalizeHostname(new URL(url).hostname);
    const addresses = await withAbortSignal(
      () => this.resolveAddresses(host),
      signal,
    );
    if (!addresses.length)
      throw new UrlRetrieverRetrievalError(
        'URL destination has no usable address',
      );
    if (
      addresses.some((address) =>
        isBlockedPdfAddress(address, this.blockedAddresses),
      )
    ) {
      await withAbortSignal(() => assertPrivateAccess(url), signal);
      return undefined;
    }
    return this.publicDispatcher;
  }

  onModuleDestroy(): Promise<void> {
    return this.publicDispatcher.close();
  }

  protected resolveAddresses(hostname: string): Promise<string[]> {
    return resolveHostnameAddresses(hostname);
  }

  private async connectionAddresses(hostname: string, options: LookupOptions) {
    const addresses = await this.resolveAddresses(normalizeHostname(hostname));
    if (
      !addresses.length ||
      addresses.some((address) =>
        isBlockedPdfAddress(address, this.blockedAddresses),
      )
    ) {
      throw new UrlRetrieverRetrievalError(
        'URL destination resolves to a private or reserved address',
      );
    }
    const records = connectionAddressRecords(addresses, options.family);
    if (!records.length)
      throw new UrlRetrieverRetrievalError(
        'URL destination has no usable address',
      );
    return records;
  }
}

function buildDiscoveredPdfBlockedAddresses(): BlockList {
  const blocked = buildBlockedAddresses();
  /* eslint-disable sonarjs/no-hardcoded-ip -- Additional non-global IPv6 ranges from the IANA special-purpose registry. */
  const ranges: Array<[string, number]> = [
    ['64:ff9b:1::', 48],
    ['100:0:0:1::', 64],
    ['2001:2::', 48],
    ['3fff::', 20],
    ['5f00::', 16],
  ];
  /* eslint-enable sonarjs/no-hardcoded-ip */
  for (const [address, prefix] of ranges)
    blocked.addSubnet(address, prefix, 'ipv6');
  return blocked;
}

function isBlockedPdfAddress(address: string, blocked: BlockList): boolean {
  if (!address.includes(':')) return isBlockedNetworkAddress(address, blocked);
  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const nat64 = /^64:ff9b::(?:([0-9a-f]+):)?([0-9a-f]*)$/.exec(normalized);
  if (!nat64) return isBlockedNetworkAddress(address, blocked);
  const high = parseInt(nat64[1] || '0', 16);
  const low = parseInt(nat64[2] || '0', 16);
  const ipv4 = [high >>> 8, high & 255, low >>> 8, low & 255].join('.');
  return isBlockedNetworkAddress(ipv4, blocked);
}
