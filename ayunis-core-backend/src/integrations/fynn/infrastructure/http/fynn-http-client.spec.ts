import { fynnSweepContext } from 'src/integrations/fynn/application/services/fynn-read-context';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { FynnHttpClient } from './fynn-http-client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';
const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, '../../application/services/fixtures/preview-cases.json'),
    'utf8',
  ),
) as FynnSnapshot[];

describe('Fynn HTTP boundary', () => {
  let server: Server;
  let baseUrl: string;
  let status: number;
  let response: unknown;
  let requests: Array<{ url: string; authorization?: string }>;
  beforeEach(async () => {
    status = 200;
    response = { data: [] };
    requests = [];
    server = createServer((req, res) => {
      requests.push({
        url: req.url ?? '',
        authorization: req.headers.authorization,
      });
      res.writeHead(status, {
        'Content-Type': 'application/json',
        Location: '/redirected',
      });
      const body =
        typeof response === 'function' ? response(req.url) : response;
      res.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  function client(apiKey: string | undefined = 'test-key'): FynnHttpClient {
    return new FynnHttpClient(
      new ConfigService({ fynn: { apiKey, baseUrl, timeoutMs: 1000 } }),
    );
  }
  it('allows an IPv6 loopback HTTP base without treating it as misconfigured', async () => {
    baseUrl = 'http://[::1]:8080';
    const request = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(fixtures[0].subscription));
    try {
      await expect(
        client().getSubscription(fixtures[0].subscription.id),
      ).resolves.toEqual(fixtures[0].subscription);
    } finally {
      request.mockRestore();
    }
  });
  it('sends a bearer token and validates a subscription response', async () => {
    response = fixtures[0].subscription;
    const result = await client().getSubscription(fixtures[0].subscription.id);
    expect(result).toEqual(fixtures[0].subscription);
    expect(requests).toEqual([
      { url: `/subscriptions/${result.id}`, authorization: 'Bearer test-key' },
    ]);
  });
  it('accepts subscription list summaries without items and reloads full subscriptions separately', async () => {
    const summary = structuredClone(fixtures[0].subscription);
    Reflect.deleteProperty(summary, 'items');
    response = { data: [summary], meta: { pagination: { totalItems: 1 } } };
    expect(await client().listSubscriptions(summary.customer.id)).toEqual([
      summary,
    ]);
  });
  it('enumerates customers once per sweep and refreshes in the next sweep', async () => {
    response = { data: [], meta: { pagination: { totalItems: 0 } } };
    const instance = client();
    await fynnSweepContext.run({}, async () => {
      const now = Date.now();
      const time = jest.spyOn(Date, 'now');
      try {
        for (let org = 0; org < 100; org++) {
          time.mockReturnValue(now + org * 30_000);
          await instance.listCustomerLinks();
        }
      } finally {
        time.mockRestore();
      }
    });
    expect(requests).toHaveLength(1);
    await fynnSweepContext.run({}, () => instance.listCustomerLinks());
    expect(requests).toHaveLength(2);
  });
  it('reads all customer-link pages', async () => {
    response = (url: string) => ({
      data: url.includes('page=1')
        ? [{ id: 'customer-a', customFields: {} }]
        : [{ id: 'customer-b', customFields: [] }],
      meta: { pagination: { totalItems: 2 } },
    });
    expect(await client().listCustomerLinks()).toHaveLength(2);
    expect(requests.map((req) => req.url)).toEqual([
      '/customers?page=1&limit=100',
      '/customers?page=2&limit=100',
    ]);
  });
  it('rejects repeated resource IDs with changed fields across pages', async () => {
    response = (url: string) => ({
      data: [
        {
          id: 'same-customer',
          customFields: { revision: url.includes('page=1') ? 1 : 2 },
        },
      ],
      meta: { pagination: { totalItems: 2 } },
    });
    await expect(client().listCustomerLinks()).rejects.toThrow();
  });
  it('rejects incomplete pagination instead of treating a missing page as no subscriptions', async () => {
    response = { data: [], meta: { pagination: { totalItems: 1 } } };
    await expect(client().listCustomerLinks()).rejects.toThrow();
  });
  it('rejects malformed snapshots before they can change Core', async () => {
    response = { data: { id: 'broken' } };
    await expect(client().getSubscription('broken')).rejects.toThrow();
  });
  it.each([401, 429, 500])(
    'rejects upstream HTTP %i without exposing the response body',
    async (code) => {
      status = code;
      response = { secret: 'sensitive-provider-response' };
      await expect(client().getSubscription('id')).rejects.not.toThrow(
        'sensitive-provider-response',
      );
    },
  );
  it('cancels streaming error bodies before rejecting the request', async () => {
    const cancel = jest.fn();
    const body = new ReadableStream({ cancel });
    const request = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(body, { status: 429 }));
    try {
      await expect(client().getSubscription('id')).rejects.toThrow();
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(body.locked).toBe(false);
    } finally {
      request.mockRestore();
    }
  });
  it('does not follow redirects with credentials', async () => {
    status = 302;
    await expect(client().getSubscription('id')).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });
  it('fails before making requests without credentials', async () => {
    const instance = new FynnHttpClient(
      new ConfigService({ fynn: { baseUrl } }),
    );
    await expect(instance.listCustomerLinks()).rejects.toThrow();
    expect(requests).toEqual([]);
  });
});
