import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LookupOptions } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { Agent, type Dispatcher } from 'undici';
import { McpOAuthFetchPort } from '../../application/ports/mcp-oauth-fetch.port';

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

@Injectable()
export class McpOAuthFetchService
  extends McpOAuthFetchPort
  implements OnModuleDestroy
{
  private readonly blockedAddresses = buildBlockedAddresses();
  private readonly connectionLookup: LookupFunction = (
    hostname,
    options,
    callback,
  ) => {
    void this.resolveConnectionAddresses(hostname, options).then(
      (addresses) => respondToLookup(options, callback, addresses),
      (error: unknown) => callback(toLookupError(error), '', 0),
    );
  };
  private readonly dispatcher = new Agent({
    connect: { lookup: this.connectionLookup },
  });

  constructor(private readonly config: ConfigService) {
    super();
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const request = await this.normalizeRequest(input, init);
    return this.fetchFollowingRedirects(request.url, request.init);
  };

  onModuleDestroy(): Promise<void> {
    return this.dispatcher.close();
  }

  protected async resolveAddresses(hostname: string): Promise<string[]> {
    const addressFamily = isIP(hostname);
    if (addressFamily) return [hostname];
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.map(({ address }) => address);
  }

  private async fetchFollowingRedirects(
    initialUrl: URL,
    initialInit: RequestInit,
  ): Promise<Response> {
    let url = initialUrl;
    let init = initialInit;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await this.assertAllowed(url);
      const response = await globalThis.fetch(url, {
        ...init,
        redirect: 'manual',
        dispatcher: this.dispatcher,
      } as RequestInit & { dispatcher: Dispatcher });
      const location = response.headers.get('location');
      if (!REDIRECT_STATUSES.has(response.status) || !location) return response;
      const nextUrl = new URL(location, url);
      await response.body?.cancel();
      await this.assertAllowed(nextUrl);
      if (nextUrl.origin !== url.origin) {
        throw new Error('Cross-origin OAuth redirects are not allowed');
      }
      init = this.redirectedInit(response.status, init);
      url = nextUrl;
    }
    throw new Error(`OAuth request exceeded ${MAX_REDIRECTS} redirects`);
  }

  private async assertAllowed(url: URL): Promise<void> {
    const hostname = normalizeHostname(url.hostname);
    const development = this.config.get<boolean>('app.isDevelopment') ?? false;
    const developmentLoopback = development && LOOPBACK_HOSTS.has(hostname);
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && developmentLoopback)
    ) {
      throw new Error('OAuth endpoints must use HTTPS');
    }
    await this.requireAllowedAddresses(hostname, developmentLoopback);
  }

  private async resolveConnectionAddresses(
    hostname: string,
    options: LookupOptions,
  ): Promise<Array<{ address: string; family: 4 | 6 }>> {
    const normalizedHostname = normalizeHostname(hostname);
    const developmentLoopback = this.isDevelopmentLoopback(normalizedHostname);
    const addresses = await this.requireAllowedAddresses(
      normalizedHostname,
      developmentLoopback,
    );
    const family = normalizeFamily(options.family);
    const records = addresses
      .map((address) => ({ address, family: isIP(address) as 4 | 6 }))
      .filter((record) => !family || record.family === family);
    if (!records.length)
      throw new Error('OAuth endpoint has no usable address');
    return records;
  }

  private async requireAllowedAddresses(
    hostname: string,
    developmentLoopback: boolean,
  ): Promise<string[]> {
    const addresses = await this.resolveAddresses(hostname);
    const blocked = addresses.some((address) => this.isBlocked(address));
    if (!addresses.length || (!developmentLoopback && blocked)) {
      throw new Error(
        'OAuth endpoint resolves to a private or reserved address',
      );
    }
    return addresses;
  }

  private isDevelopmentLoopback(hostname: string): boolean {
    const development = this.config.get<boolean>('app.isDevelopment') ?? false;
    return development && LOOPBACK_HOSTS.has(hostname);
  }

  private isBlocked(address: string): boolean {
    const family = isIP(address);
    if (family === 4) return this.blockedAddresses.check(address, 'ipv4');
    if (family === 6) return this.blockedAddresses.check(address, 'ipv6');
    return true;
  }

  private async normalizeRequest(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<{ url: URL; init: RequestInit }> {
    const request = new Request(
      input instanceof URL ? input.href : input,
      init,
    );
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.clone().arrayBuffer();
    return {
      url: new URL(request.url),
      init: {
        method: request.method,
        headers: new Headers(request.headers),
        body,
        signal: request.signal,
      },
    };
  }

  private redirectedInit(status: number, init: RequestInit): RequestInit {
    if (
      status !== 303 &&
      !([301, 302].includes(status) && init.method === 'POST')
    ) {
      return init;
    }
    const headers = new Headers(init.headers);
    headers.delete('content-length');
    headers.delete('content-type');
    return { ...init, method: 'GET', headers, body: undefined };
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

function normalizeFamily(family: LookupOptions['family']): 4 | 6 | undefined {
  if (family === 4 || family === 'IPv4') return 4;
  if (family === 6 || family === 'IPv6') return 6;
  return undefined;
}

function respondToLookup(
  options: LookupOptions,
  callback: Parameters<LookupFunction>[2],
  addresses: Array<{ address: string; family: 4 | 6 }>,
): void {
  if (options.all) callback(null, addresses);
  else callback(null, addresses[0].address, addresses[0].family);
}

function toLookupError(error: unknown): NodeJS.ErrnoException {
  return error instanceof Error ? error : new Error('OAuth DNS lookup failed');
}

function buildBlockedAddresses(): BlockList {
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
