import type { ContextService } from 'src/common/context/services/context.service';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

type Entries = Map<string, Promise<UrlRetrieverResult>>;

/**
 * Bounded memo of retrieval results for the active CLS request. Weak request
 * keys keep results from outliving the request; concurrent reads share one
 * pending load, and failed or oversized results are not retained.
 */
export class RequestScopedResultCache {
  private readonly requests = new WeakMap<object, Entries>();

  constructor(
    private readonly context: ContextService,
    private readonly limits: { maxEntries: number; maxEntryBytes: number },
  ) {}

  has(key: string): boolean {
    return this.entries()?.has(key) ?? false;
  }

  getOrLoad(
    key: string,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult> {
    const entries = this.entries();
    if (!entries) return load();
    const existing = entries.get(key);
    if (existing) return existing;
    if (entries.size >= this.limits.maxEntries) return load();

    const promise = Promise.resolve()
      .then(load)
      .then((result) => {
        if (!this.fits(key, result)) entries.delete(key);
        return result;
      })
      .catch((error: unknown) => {
        entries.delete(key);
        throw error;
      });
    entries.set(key, promise);
    return promise;
  }

  private entries(): Entries | null {
    if (!this.context.isActive()) return null;
    const store = this.context.get();
    const entries: Entries =
      this.requests.get(store) ??
      new Map<string, Promise<UrlRetrieverResult>>();
    this.requests.set(store, entries);
    return entries;
  }

  private fits(key: string, result: UrlRetrieverResult): boolean {
    try {
      return (
        Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(result)) <=
        this.limits.maxEntryBytes
      );
    } catch {
      return false;
    }
  }
}
