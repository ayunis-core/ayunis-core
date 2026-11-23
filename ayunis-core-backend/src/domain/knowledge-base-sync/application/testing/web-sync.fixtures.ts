import { UrlRetrieverHttpError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import type { CrawlUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.command';
import {
  UrlCrawlFailure,
  type UrlCrawlFailureKind,
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import { WebSyncSource } from 'src/domain/knowledge-base-sync/application/services/web-sync-source.service';
import { WebSyncedLocation } from 'src/domain/knowledge-base-sync/domain/web-synced-location.entity';
import {
  connectorSyncSources,
  FakeSourceSystem,
  harnessFor,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from './knowledge-base-sync.fixtures';

export const WEBSITE = 'https://www.musterstadt.de/';

interface FakePage {
  title: string;
  text: string;
}

interface FakePdf {
  label: string;
  content: string;
  version: string;
}

/**
 * A website as the URL crawler finds it: the pages it reaches and the PDFs
 * they link to. A page or PDF that is not added is not reached; one in
 * `crawlFailures` was found but could not be read.
 */
export class FakeWebsite {
  rootReachable = true;
  /** Thrown by the crawl while the root is unreachable; a 503 by default. */
  rootError: Error | null = null;
  readonly crawls: CrawlUrlCommand[] = [];
  readonly crawlFailures = new Map<string, UrlCrawlFailureKind>();
  /** The URL a page is linked as, when it redirects to its own. */
  readonly linkedAs = new Map<string, string>();
  /** Thrown when the URL is read after the crawl. */
  readonly readErrors = new Map<string, Error>();
  private readonly pages = new Map<string, FakePage>([
    [WEBSITE, { title: 'Startseite', text: 'Willkommen in Musterstadt' }],
  ]);
  private readonly pdfs = new Map<string, FakePdf>();
  private versions = 0;

  page(path: string, page: FakePage): string {
    const url = new URL(path, WEBSITE).toString();
    this.pages.set(url, page);
    return url;
  }

  editPage(url: string, changes: Partial<FakePage>): void {
    this.pages.set(url, { ...this.pages.get(url)!, ...changes });
  }

  pdf(path: string, label: string, content = `${label} v1`): string {
    const url = new URL(path, WEBSITE).toString();
    this.pdfs.set(url, { label, content, version: this.nextVersion() });
    return url;
  }

  editPdf(url: string, content: string): void {
    this.pdfs.set(url, {
      ...this.pdfs.get(url)!,
      content,
      version: this.nextVersion(),
    });
  }

  /** No longer linked: the crawl does not reach it. */
  unlink(url: string): void {
    this.pages.delete(url);
    this.pdfs.delete(url);
  }

  readonly crawler = {
    execute: (command: CrawlUrlCommand) => {
      this.crawls.push(command);
      if (!this.rootReachable)
        return Promise.reject(
          this.rootError ?? new UrlRetrieverHttpError(command.url, 503),
        );
      const reached = <T>(entries: Map<string, T>) =>
        [...entries].filter(([url]) => !this.crawlFailures.has(url));
      return Promise.resolve(
        new UrlCrawlResult(
          reached(this.pages).map(
            ([url, { title, text }]) => new UrlCrawlPage(url, text, title),
          ),
          reached(this.pdfs).map(([url, { label, version }]) => ({
            url,
            name: label,
            version,
          })),
          // A failed fetch knows only the URL as linked.
          [...this.crawlFailures].map(
            ([url, kind]) =>
              new UrlCrawlFailure(this.linkedAs.get(url) ?? url, kind),
          ),
        ),
      );
    },
  };

  readonly retrieveUrl = {
    execute: ({ url }: { url: string }) => {
      const page = this.read(url, this.pages);
      return Promise.resolve({ content: page.text, url, websiteTitle: '' });
    },
  };

  readonly downloadPdf = {
    execute: ({ url }: { url: string }) =>
      Promise.resolve(Buffer.from(this.read(url, this.pdfs).content)),
  };

  private read<T>(url: string, entries: Map<string, T>): T {
    const error = this.readErrors.get(url);
    if (error) throw error;
    const entry = entries.get(url);
    if (!entry) throw new UrlRetrieverHttpError(url, 404);
    return entry;
  }

  private nextVersion(): string {
    return `etag:"${++this.versions}"`;
  }
}

/** The sync engine around one website location, crawled from `website`. */
export function createWebSyncHarness(
  options: { connectorsEnabled?: boolean; depth?: number } = {},
) {
  const website = new FakeWebsite();
  const location = new WebSyncedLocation({
    orgId: ORG_ID,
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    location: WEBSITE,
    depth: options.depth ?? 2,
  });
  const sources = connectorSyncSources(
    new FakeSourceSystem(),
    new WebSyncSource(
      website.crawler as never,
      website.retrieveUrl as never,
      website.downloadPdf as never,
    ),
  );
  return { ...harnessFor(location, sources, options), website };
}
