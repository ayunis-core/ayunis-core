import { isIP } from 'node:net';
import { UrlDestinationGuardService } from './url-destination-guard.service';

/* eslint-disable sonarjs/no-hardcoded-ip -- These addresses exercise the private-destination policy. */
class StubGuard extends UrlDestinationGuardService {
  constructor(private readonly addresses: string[]) {
    super();
  }
  protected override async resolveAddresses(
    hostname: string,
  ): Promise<string[]> {
    return isIP(hostname) ? [hostname] : this.addresses;
  }
}
class RebindingGuard extends UrlDestinationGuardService {
  private resolutions = 0;
  constructor(private readonly rebound = '127.0.0.1') {
    super();
  }
  protected override async resolveAddresses(): Promise<string[]> {
    return ++this.resolutions === 1 ? ['1.1.1.1'] : [this.rebound];
  }
}
const signal = new AbortController().signal;

describe('UrlDestinationGuardService', () => {
  it.each([
    '127.0.0.1',
    '10.2.3.4',
    '169.254.169.254',
    '192.168.1.8',
    '[::1]',
    '[::ffff:127.0.0.1]',
    '[64:ff9b:1::a00:1]',
    '[64:ff9b::a9fe:a9fe]',
    '[64:ff9b::7f00:1]',
    '[64:ff9b:0:0:0:0:c0a8:108]',
    '[3fff::1]',
    '[5f00::1]',
    '[100:0:0:1::1]',
    '[2001:2::1]',
  ])('requires explicit access for private target %s', async (host) => {
    const guard = new StubGuard([]);
    const denied = jest.fn(async () => {
      throw new Error('Explicit org grant required');
    });
    try {
      await expect(
        guard.dispatcherFor(`http://${host}/statute.pdf`, denied, signal),
      ).rejects.toThrow('Explicit org grant required');
      expect(denied).toHaveBeenCalledTimes(1);
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('permits public IPv4 reached through the well-known NAT64 prefix', async () => {
    const guard = new StubGuard(['64:ff9b::101:101']);
    const grant = jest.fn();
    try {
      expect(
        await guard.dispatcherFor(
          'https://public.customer.de/statute.pdf',
          grant,
          signal,
        ),
      ).toBeDefined();
      expect(grant).not.toHaveBeenCalled();
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('denies an ungranted hostname that resolves to a private address', async () => {
    const guard = new StubGuard(['10.24.0.5']);
    const denied = jest.fn(async () => {
      throw new Error('Explicit org grant required');
    });
    try {
      await expect(
        guard.dispatcherFor(
          'https://intranet.customer.de/statute.pdf',
          denied,
          signal,
        ),
      ).rejects.toThrow('Explicit org grant required');
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('denies a DNS answer with a private IPv4 encoded through NAT64', async () => {
    const guard = new StubGuard(['64:ff9b::7f00:1']);
    try {
      await expect(
        guard.dispatcherFor(
          'https://public.customer.de/statute.pdf',
          async () => {
            throw new Error('Grant required');
          },
          signal,
        ),
      ).rejects.toThrow('Grant required');
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('requires a grant when any DNS answer is private and permits an approved intranet', async () => {
    const guard = new StubGuard(['1.1.1.1', '10.24.0.5']);
    const granted = jest.fn(async () => undefined);
    try {
      await expect(
        guard.dispatcherFor(
          'https://intranet.customer.de/statute.pdf',
          granted,
          signal,
        ),
      ).resolves.toBeUndefined();
      expect(granted).toHaveBeenCalledWith(
        'https://intranet.customer.de/statute.pdf',
      );
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('uses a separate protected dispatcher for public requests without requiring grants', async () => {
    const guard = new StubGuard(['1.1.1.1']);
    const grant = jest.fn();
    try {
      expect(
        await guard.dispatcherFor(
          'https://public.customer.de/statute.pdf',
          grant,
          signal,
        ),
      ).toBeDefined();
      expect(grant).not.toHaveBeenCalled();
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it.each(['127.0.0.1', '64:ff9b::a9fe:a9fe'])(
    'blocks DNS rebinding to %s at the actual connection lookup',
    async (rebound) => {
      const guard = new RebindingGuard(rebound);
      try {
        const dispatcher = await guard.dispatcherFor(
          'https://public.customer.de/statute.pdf',
          jest.fn(),
          signal,
        );
        expect(dispatcher).toBeDefined();
        await expect(
          fetch('https://public.customer.de/statute.pdf', {
            dispatcher,
          } as RequestInit),
        ).rejects.toMatchObject({
          cause: expect.objectContaining({
            message: expect.stringContaining(
              'URL destination resolves to a private or reserved address',
            ),
          }),
        });
      } finally {
        await guard.onModuleDestroy();
      }
    },
  );

  it('honors aborts while waiting for a private-domain grant query', async () => {
    const guard = new StubGuard([]);
    const controller = new AbortController();
    let grantStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      grantStarted = resolve;
    });
    try {
      const pending = guard.dispatcherFor(
        'https://127.0.0.1/statute.pdf',
        () => {
          grantStarted();
          return new Promise(() => undefined);
        },
        controller.signal,
      );
      await started;
      controller.abort();
      const outcome = await Promise.race([
        pending.then(
          () => null,
          (error: unknown) => error,
        ),
        new Promise((resolve) => setImmediate(() => resolve('still waiting'))),
      ]);
      expect(outcome).toMatchObject({ name: 'AbortError' });
    } finally {
      await guard.onModuleDestroy();
    }
  });

  it('honors aborts while checking DNS before a request', async () => {
    class SlowGuard extends UrlDestinationGuardService {
      protected override resolveAddresses(): Promise<string[]> {
        return new Promise(() => undefined);
      }
    }
    const guard = new SlowGuard();
    const controller = new AbortController();
    try {
      const pending = guard.dispatcherFor(
        'https://public.customer.de/statute.pdf',
        jest.fn(),
        controller.signal,
      );
      controller.abort();
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      await guard.onModuleDestroy();
    }
  });
});
