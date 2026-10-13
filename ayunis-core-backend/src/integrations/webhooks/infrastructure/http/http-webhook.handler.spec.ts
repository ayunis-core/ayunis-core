import { createHmac, randomBytes } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import { HttpWebhookHandler } from './http-webhook.handler';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

class TestWebhookEvent extends WebhookEvent<{ hello: string }> {
  readonly eventType = WebhookEventType.USER_CREATED;
  readonly data = { hello: 'world' };
  readonly timestamp = new Date('2026-04-07T12:00:00.000Z');
}

class CreditWebhookEvent extends WebhookEvent<{ creditsConsumed: number }> {
  readonly data = { creditsConsumed: 10 };
  readonly timestamp = new Date('2026-04-07T12:00:00.000Z');

  constructor(readonly eventType: WebhookEventType) {
    super();
  }
}

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

function makeConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function installFetchMock(): {
  captured: CapturedRequest[];
  restore: () => void;
} {
  const captured: CapturedRequest[] = [];
  const original = global.fetch;
  global.fetch = jest
    .fn()
    .mockImplementation((url: string, init: RequestInit) => {
      captured.push({ url, init });
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);
    });
  return {
    captured,
    restore: () => {
      global.fetch = original;
    },
  };
}

describe('HttpWebhookHandler signing', () => {
  const webhookUrl = 'https://example.com/hook';
  let fetchMock: ReturnType<typeof installFetchMock>;

  beforeEach(() => {
    fetchMock = installFetchMock();
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchMock.restore();
    jest.restoreAllMocks();
  });

  it('signs the body with HMAC-SHA256 when a secret is configured', async () => {
    const secret = randomBytes(32).toString('hex');
    const handler = new HttpWebhookHandler(
      makeConfigService({
        'app.orgEventsWebhookUrl': webhookUrl,
        'app.webhookSigningSecret': secret,
      }),
    );

    await handler.sendWebhook(new TestWebhookEvent());

    expect(fetchMock.captured).toHaveLength(1);
    const { init } = fetchMock.captured[0];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;

    expect(headers['X-Webhook-Signature']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

    const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(
      headers['X-Webhook-Signature'],
    );
    expect(match).not.toBeNull();
    const timestamp = match![1];
    const signature = match![2];

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(signature).toBe(expected);
  });

  it('omits the signature header when no secret is configured', async () => {
    const handler = new HttpWebhookHandler(
      makeConfigService({
        'app.orgEventsWebhookUrl': webhookUrl,
        'app.webhookSigningSecret': undefined,
      }),
    );

    await handler.sendWebhook(new TestWebhookEvent());

    expect(fetchMock.captured).toHaveLength(1);
    const headers = fetchMock.captured[0].init.headers as Record<
      string,
      string
    >;
    expect(headers).not.toHaveProperty('X-Webhook-Signature');
  });

  it('signs the exact bytes that are sent in the body', async () => {
    const secret = randomBytes(32).toString('hex');
    const handler = new HttpWebhookHandler(
      makeConfigService({
        'app.orgEventsWebhookUrl': webhookUrl,
        'app.webhookSigningSecret': secret,
      }),
    );

    await handler.sendWebhook(new TestWebhookEvent());

    const { init } = fetchMock.captured[0];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;

    // The body must be a string (never re-stringified inside the handler)
    expect(typeof body).toBe('string');

    // Round-trip the body and re-verify the signature against it.
    const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(
      headers['X-Webhook-Signature'],
    );
    const timestamp = match![1];
    const signature = match![2];
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(signature).toBe(expected);
  });

  it('does nothing when no webhook URL is configured', async () => {
    const handler = new HttpWebhookHandler(
      makeConfigService({
        'app.orgEventsWebhookUrl': undefined,
        'app.webhookSigningSecret': randomBytes(16).toString('hex'),
      }),
    );

    await handler.sendWebhook(new TestWebhookEvent());

    expect(fetchMock.captured).toHaveLength(0);
  });

  it.each([
    WebhookEventType.USAGE_COLLECTED,
    WebhookEventType.USAGE_MONTHLY_CREDITS_SNAPSHOT,
  ])('does not blindly retry non-idempotent %s delivery', async (eventType) => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network uncertain'));
    const handler = new HttpWebhookHandler(
      makeConfigService({
        'app.orgEventsWebhookUrl': webhookUrl,
        'app.webhookSigningSecret': randomBytes(16).toString('hex'),
      }),
    );

    await expect(
      handler.sendWebhook(new CreditWebhookEvent(eventType)),
    ).rejects.toThrow('network uncertain');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retains three attempts for idempotent lifecycle webhooks', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const handler = new HttpWebhookHandler(
      makeConfigService({ 'app.orgEventsWebhookUrl': webhookUrl }),
    );

    const delivery = handler.sendWebhook(new TestWebhookEvent());
    const rejection = expect(delivery).rejects.toThrow('network down');
    await jest.runAllTimersAsync();
    await rejection;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('allows a monthly reconciliation scan up to sixty seconds', async () => {
    jest.useFakeTimers().setSystemTime(0);
    let signal: AbortSignal | null | undefined;
    global.fetch = jest.fn().mockImplementation((_url, init: RequestInit) => {
      signal = init.signal;
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });
    const handler = new HttpWebhookHandler(
      makeConfigService({ 'app.orgEventsWebhookUrl': webhookUrl }),
    );
    const delivery = handler.sendWebhook(
      new CreditWebhookEvent(WebhookEventType.USAGE_MONTHLY_CREDITS_SNAPSHOT),
    );
    const rejection = expect(delivery).rejects.toThrow(
      'timed out after 60000ms',
    );

    await jest.advanceTimersByTimeAsync(59999);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    await rejection;
  });
});
