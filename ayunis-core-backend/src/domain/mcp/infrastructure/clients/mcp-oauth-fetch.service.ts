import {
  buildBlockedAddresses,
  createConnectionLookup,
  isBlockedNetworkAddress,
  normalizeHostname,
  resolveHostnameAddresses,
  connectionAddressRecords,
} from 'src/common/util/network-address-policy';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LookupOptions } from 'node:dns';
// This Agent only works as a `dispatcher` for globalThis.fetch while the
// undici major matches the one Node embeds — undici 8 dropped the legacy
// handler API. Bump this dep and the node image together, never apart.
import { Agent, type Dispatcher } from 'undici';
import { McpOAuthFetchPort } from 'src/domain/mcp/application/ports/mcp-oauth-fetch.port';

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

@Injectable()
export class McpOAuthFetchService
  extends McpOAuthFetchPort
  implements OnModuleDestroy
{
  private readonly blockedAddresses = buildBlockedAddresses();
  private readonly connectionLookup = createConnectionLookup(
    (hostname, options) => this.resolveConnectionAddresses(hostname, options),
    'OAuth DNS lookup failed',
  );
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
    return resolveHostnameAddresses(hostname);
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
    const records = connectionAddressRecords(addresses, options.family);
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
    return isBlockedNetworkAddress(address, this.blockedAddresses);
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
