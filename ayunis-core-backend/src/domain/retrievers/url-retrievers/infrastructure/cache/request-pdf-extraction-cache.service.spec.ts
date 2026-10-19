import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import {
  ContextService,
  type MyClsStore,
} from 'src/common/context/services/context.service';
import type { RawUrlResponse } from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { RequestPdfExtractionCacheService } from './request-pdf-extraction-cache.service';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
const otherOrgId = '22222222-2222-2222-2222-222222222222' as UUID;
const userId = '33333333-3333-3333-3333-333333333333' as UUID;
const otherUserId = '44444444-4444-4444-4444-444444444444' as UUID;
const url = 'https://council.example.de/building-regulations.pdf';
const result = new UrlRetrieverResult(
  'Building regulations',
  url,
  'Regulations',
  { model: 'mistral-ocr-latest' },
);
const raw = (body = 'regulations', finalUrl = url): RawUrlResponse => ({
  body: Buffer.from(body),
  finalUrl,
  contentType: 'application/pdf',
});

describe('RequestPdfExtractionCacheService', () => {
  let cls: ContextService;
  let cache: RequestPdfExtractionCacheService;
  let load: jest.Mock<Promise<UrlRetrieverResult>, []>;

  beforeEach(() => {
    cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
    cache = new RequestPdfExtractionCacheService(cls);
    load = jest.fn().mockResolvedValue(result);
  });

  it('reuses extraction within one request', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('starts fresh in the next request from the same principal', async () => {
    for (let request = 0; request < 2; request++) {
      await cls.runWith({ orgId, userId }, () =>
        cache.getOrLoad(orgId, raw(), load),
      );
    }
    expect(load).toHaveBeenCalledTimes(2);
  });

  it.each([
    { orgId, userId: otherUserId },
    { orgId: otherOrgId, userId: otherUserId },
  ])('does not share results with principal %j', async (principal) => {
    const other = new UrlRetrieverResult(
      'Other principal extraction',
      url,
      'Other',
    );
    load.mockResolvedValueOnce(result).mockResolvedValueOnce(other);
    const reads = await Promise.all([
      cls.runWith({ orgId, userId }, () => cache.getOrLoad(orgId, raw(), load)),
      cls.runWith(principal, () =>
        cache.getOrLoad(principal.orgId, raw(), load),
      ),
    ]);
    expect(reads).toEqual([result, other]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('separates explicit organization targets even in one context', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      await cache.getOrLoad(orgId, raw(), load);
      await cache.getOrLoad(otherOrgId, raw(), load);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares a pending extraction between concurrent reads', async () => {
    let complete!: (value: UrlRetrieverResult) => void;
    load.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await cls.runWith({ orgId, userId }, async () => {
      const first = cache.getOrLoad(orgId, raw(), load);
      const second = cache.getOrLoad(orgId, raw(), load);
      await Promise.resolve();
      expect(load).toHaveBeenCalledTimes(1);
      complete(result);
      expect(await Promise.all([first, second])).toEqual([result, result]);
    });
  });

  it('reextracts when the bytes change and preserves the original snapshot', async () => {
    const revised = new UrlRetrieverResult(
      'Revised regulations',
      url,
      'Regulations',
    );
    load.mockResolvedValueOnce(result).mockResolvedValueOnce(revised);
    await cls.runWith({ orgId, userId }, async () => {
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
      expect(await cache.getOrLoad(orgId, raw('revised'), load)).toEqual(
        revised,
      );
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a different final URL with identical bytes', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      await cache.getOrLoad(orgId, raw(), load);
      await cache.getOrLoad(
        orgId,
        raw('regulations', 'https://council.example.de/other.pdf'),
        load,
      );
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('allows retry after an extraction failure', async () => {
    const error = new Error('OCR unavailable');
    load.mockRejectedValueOnce(error).mockResolvedValueOnce(result);
    await cls.runWith({ orgId, userId }, async () => {
      await expect(cache.getOrLoad(orgId, raw(), load)).rejects.toBe(error);
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('bypasses caching without an active context', async () => {
    expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
    expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(result);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('admits at most four documents and still returns uncached results', async () => {
    await cls.runWith({ orgId, userId }, async () => {
      for (let document = 0; document < 4; document++) {
        await cache.getOrLoad(orgId, raw(String(document)), load);
      }
      expect(await cache.getOrLoad(orgId, raw('overflow'), load)).toEqual(
        result,
      );
      expect(await cache.getOrLoad(orgId, raw('overflow'), load)).toEqual(
        result,
      );
      await cache.getOrLoad(orgId, raw('0'), load);
    });
    expect(load).toHaveBeenCalledTimes(6);
  });

  it('does not retain extraction output above the UTF-8 byte limit', async () => {
    const large = new UrlRetrieverResult(
      'ä'.repeat(1024 * 1024),
      url,
      'Regulations',
    );
    load.mockResolvedValue(large);
    await cls.runWith({ orgId, userId }, async () => {
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(large);
      expect(await cache.getOrLoad(orgId, raw(), load)).toEqual(large);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
