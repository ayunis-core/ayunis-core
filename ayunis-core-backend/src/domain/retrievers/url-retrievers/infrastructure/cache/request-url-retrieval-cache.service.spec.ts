import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import {
  ContextService,
  type MyClsStore,
} from 'src/common/context/services/context.service';
import type { UrlRetrievalCacheKey } from 'src/domain/retrievers/url-retrievers/application/ports/url-retrieval-cache.port';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { RequestUrlRetrievalCacheService } from './request-url-retrieval-cache.service';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
const otherOrgId = '22222222-2222-2222-2222-222222222222' as UUID;
const userId = '33333333-3333-3333-3333-333333333333' as UUID;
const otherUserId = '44444444-4444-4444-4444-444444444444' as UUID;
const url = 'https://stadt.example.de/abfallkalender';
const page = new UrlRetrieverResult(
  'Die Biotonne wird dienstags geleert.',
  url,
  'Abfallkalender',
);
const keyFor = (
  overrides: Partial<UrlRetrievalCacheKey> = {},
): UrlRetrievalCacheKey => ({
  orgId,
  url,
  privateDestinationPolicy: 'existing',
  ...overrides,
});

describe('RequestUrlRetrievalCacheService', () => {
  let cls: ContextService;
  let cache: RequestUrlRetrievalCacheService;
  let load: jest.Mock<Promise<UrlRetrieverResult>, []>;

  beforeEach(() => {
    cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
    cache = new RequestUrlRetrievalCacheService(cls);
    load = jest.fn().mockResolvedValue(page);
  });

  it('retrieves a URL once per request', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      expect(await cache.getOrLoad(keyFor(), load)).toBe(page);
      expect(await cache.getOrLoad(keyFor(), load)).toBe(page);
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('retrieves the URL again in the next request', async () => {
    for (let request = 0; request < 2; request++) {
      await cls.runWith({ orgId, userId }, () =>
        cache.getOrLoad(keyFor(), load),
      );
    }
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not share a page with a concurrent request of another principal', async () => {
    const otherPage = new UrlRetrieverResult('Other org page', url, 'Other');
    load.mockResolvedValueOnce(page).mockResolvedValueOnce(otherPage);

    const reads = await Promise.all([
      cls.runWith({ orgId, userId }, () => cache.getOrLoad(keyFor(), load)),
      cls.runWith({ orgId: otherOrgId, userId: otherUserId }, () =>
        cache.getOrLoad(keyFor({ orgId: otherOrgId }), load),
      ),
    ]);

    expect(reads).toEqual([page, otherPage]);
  });

  it('separates organizations and destination policies within one request', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      await cache.getOrLoad(keyFor(), load);
      await cache.getOrLoad(keyFor({ orgId: otherOrgId }), load);
      await cache.getOrLoad(
        keyFor({ privateDestinationPolicy: 'explicit-grant' }),
        load,
      );
    });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('shares a pending retrieval between concurrent reads', async () => {
    let complete!: (value: UrlRetrieverResult) => void;
    load.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await cls.runWith({ orgId, userId }, async () => {
      const first = cache.getOrLoad(keyFor(), load);
      const second = cache.getOrLoad(keyFor(), load);
      await Promise.resolve();
      expect(load).toHaveBeenCalledTimes(1);
      complete(page);
      expect(await Promise.all([first, second])).toEqual([page, page]);
    });
  });

  it('retrieves again after a failed retrieval', async () => {
    const error = new Error('Gateway timeout');
    load.mockRejectedValueOnce(error);
    await cls.runWith({ orgId, userId }, async () => {
      await expect(cache.getOrLoad(keyFor(), load)).rejects.toBe(error);
      expect(await cache.getOrLoad(keyFor(), load)).toBe(page);
      expect(await cache.getOrLoad(keyFor(), load)).toBe(page);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('bypasses caching without an active context', async () => {
    await cache.getOrLoad(keyFor(), load);
    await cache.getOrLoad(keyFor(), load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('admits at most twelve pages per request and still returns uncached results', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      for (let index = 0; index < 12; index++) {
        await cache.getOrLoad(keyFor({ url: `${url}/${index}` }), load);
      }
      expect(
        await cache.getOrLoad(keyFor({ url: `${url}/overflow` }), load),
      ).toBe(page);
      await cache.getOrLoad(keyFor({ url: `${url}/overflow` }), load);
      await cache.getOrLoad(keyFor({ url: `${url}/0` }), load);
    });
    expect(load).toHaveBeenCalledTimes(14);
  });

  it('does not retain pages above the 2 MiB serialized limit', async () => {
    const large = new UrlRetrieverResult(
      'ä'.repeat(1024 * 1024),
      url,
      'Ratsprotokolle',
    );
    load.mockResolvedValue(large);
    await cls.runWith({ orgId, userId }, async () => {
      expect(await cache.getOrLoad(keyFor(), load)).toBe(large);
      expect(await cache.getOrLoad(keyFor(), load)).toBe(large);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
