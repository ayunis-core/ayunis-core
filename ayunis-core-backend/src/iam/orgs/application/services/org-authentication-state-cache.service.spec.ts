import { randomUUID } from 'crypto';
import { OrgAuthenticationStateCacheService } from './org-authentication-state-cache.service';

describe('OrgAuthenticationStateCacheService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(0));
  afterEach(() => jest.useRealTimers());

  it('evicts the oldest entry when the cache reaches its capacity', async () => {
    const cache = new OrgAuthenticationStateCacheService();
    const firstOrg = randomUUID();
    await cache.getOrLoad(firstOrg, async () => 0);
    for (let index = 0; index < 1_000; index++) {
      await cache.getOrLoad(randomUUID(), async () => 0);
    }
    expect(await cache.getOrLoad(firstOrg, async () => 1)).toBe(1);
  });

  it('does not let an expired failing read remove a newer successful entry', async () => {
    const cache = new OrgAuthenticationStateCacheService();
    const orgId = randomUUID();
    let rejectOld!: (error: Error) => void;
    const old = cache.getOrLoad(
      orgId,
      () =>
        new Promise<number>((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    const failure = expect(old).rejects.toThrow('connection lost');
    await Promise.resolve();
    jest.advanceTimersByTime(30_000);
    expect(await cache.getOrLoad(orgId, async () => 1)).toBe(1);
    rejectOld(new Error('connection lost'));
    await failure;
    expect(await cache.getOrLoad(orgId, async () => 2)).toBe(1);
  });
});
