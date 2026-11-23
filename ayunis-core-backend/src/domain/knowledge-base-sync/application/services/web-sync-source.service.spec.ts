import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import {
  createWebSyncHarness,
  WEBSITE,
} from 'src/domain/knowledge-base-sync/application/testing/web-sync.fixtures';
import { SyncLocationOutcome } from 'src/domain/knowledge-base-sync/application/use-cases/sync-location/sync-location.result';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { SyncSourceOutcome } from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { UrlCrawlFailureKind } from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import {
  UnexpectedUrlRetrieverError,
  UrlRetrieverContentTooLargeError,
  UrlRetrieverHttpError,
  UrlRetrieverTimeoutError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';

type Harness = ReturnType<typeof createWebSyncHarness>;

async function synced(harness: Harness) {
  const result = await harness.sync();
  if (result.outcome !== SyncLocationOutcome.SYNCED)
    throw new Error(`Expected a sync, got ${result.outcome}`);
  return result.summary;
}

/** A sync records its time; a real one takes longer than a millisecond. */
const aMomentLater = () => new Promise((resolve) => setTimeout(resolve, 5));

/** The documents a user sees, with where their citations open. */
function documents(harness: Harness) {
  return [...harness.knowledgeBase.documents.values()]
    .filter(({ knowledgeBaseId }) => knowledgeBaseId !== null)
    .map(({ name, fileName, url }) => ({ name, fileName, url }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function fileOf(harness: Harness, url: string) {
  const file = harness.filesOf().find((candidate) => candidate.url === url);
  if (!file) throw new Error(`No file for ${url}`);
  return file;
}

describe('WebSyncSource', () => {
  it('turns every page and every linked PDF into a document named by its title or link label and cited by its URL', async () => {
    const harness = createWebSyncHarness();
    const rathaus = harness.website.page('rathaus', {
      title: 'Rathaus',
      text: 'Öffnungszeiten',
    });
    const satzung = harness.website.pdf(
      'downloads/hundesteuer',
      'Hundesteuersatzung',
    );

    expect(await synced(harness)).toMatchObject({ added: 3 });
    expect(documents(harness)).toEqual([
      {
        name: 'Hundesteuersatzung',
        fileName: 'Hundesteuersatzung.pdf',
        url: satzung,
      },
      { name: 'Rathaus', fileName: 'Rathaus.txt', url: rathaus },
      { name: 'Startseite', fileName: 'Startseite.txt', url: WEBSITE },
    ]);
    expect(harness.jobs).toHaveLength(3);
  });

  it('crawls the website to its depth without the page and PDF caps, reading the PDF versions', async () => {
    const harness = createWebSyncHarness({ depth: 1 });

    await synced(harness);

    expect(harness.website.crawls).toEqual([
      expect.objectContaining({
        url: WEBSITE,
        maxDepth: 1,
        options: { liftCaps: true, resolvePdfVersions: true },
      }),
    ]);
  });

  it('queues a page whose text changed, only renames one whose title changed, and adds and removes PDFs by their links', async () => {
    const harness = createWebSyncHarness();
    const rathaus = harness.website.page('rathaus', {
      title: 'Rathaus',
      text: 'Öffnungszeiten',
    });
    const impressum = harness.website.page('impressum', {
      title: 'Impressum',
      text: 'Stadt Musterstadt',
    });
    const satzung = harness.website.pdf('hundesteuer.pdf', 'Hundesteuer');
    const plan = harness.website.pdf('haushalt.pdf', 'Haushaltsplan');
    await synced(harness);
    const before = (url: string) => fileOf(harness, url);
    const [rathausBefore, impressumBefore] = [
      before(rathaus),
      before(impressum),
    ];

    harness.website.editPage(rathaus, { text: 'Neue Öffnungszeiten' });
    harness.website.editPage(impressum, { title: 'Impressum und Kontakt' });
    harness.website.editPdf(satzung, 'Hundesteuer v2');
    harness.website.unlink(plan);
    const gebuehren = harness.website.pdf('gebuehren.pdf', 'Gebühren');
    await aMomentLater();

    expect(await synced(harness)).toMatchObject({
      added: 1,
      removed: 1,
      relabelled: 1,
      contentChanged: 2,
    });
    expect(fileOf(harness, rathaus)).toMatchObject({
      sourceId: rathausBefore.sourceId,
      name: 'Rathaus',
    });
    expect(fileOf(harness, rathaus).version).not.toBe(rathausBefore.version);
    expect(fileOf(harness, impressum)).toMatchObject({
      sourceId: impressumBefore.sourceId,
      version: impressumBefore.version,
      fileName: 'Impressum und Kontakt.txt',
    });
    expect(documents(harness).map(({ name }) => name)).toEqual([
      'Gebühren',
      'Hundesteuer',
      'Impressum und Kontakt',
      'Rathaus',
      'Startseite',
    ]);
    expect(fileOf(harness, gebuehren).state).toBe(SyncedFileState.IMPORTED);
  });

  it('points the citation of a page at the URL it is now served from, keeping its document', async () => {
    const harness = createWebSyncHarness();
    const page = { title: 'Rathaus', text: 'Öffnungszeiten' };
    const before = harness.website.page('rathaus', page);
    await synced(harness);
    const document = fileOf(harness, before).sourceId;

    harness.website.unlink(before);
    const after = harness.website.page('https://musterstadt.de/rathaus/', page);
    await aMomentLater();

    expect(await synced(harness)).toMatchObject({
      added: 0,
      removed: 0,
      relabelled: 1,
      contentChanged: 0,
    });
    expect(fileOf(harness, after).sourceId).toBe(document);
    expect(documents(harness)).toContainEqual(
      expect.objectContaining({ name: 'Rathaus', url: after }),
    );
  });

  it('keeps the document of a page or PDF that failed for now, and removes those that are gone and the pages no longer reached', async () => {
    const harness = createWebSyncHarness();
    const busy = harness.website.page('buergerservice', {
      title: 'Bürgerservice',
      text: 'Termine',
    });
    const busyPdf = harness.website.pdf('formular.pdf', 'Formular');
    const gone = harness.website.page('alt', { title: 'Alt', text: 'Alt' });
    const behindBusy = harness.website.page('buergerservice/termine', {
      title: 'Termine',
      text: 'Online buchen',
    });
    await synced(harness);
    const kept = [fileOf(harness, busy), fileOf(harness, busyPdf)];

    harness.website.crawlFailures.set(busy, UrlCrawlFailureKind.TRANSIENT);
    harness.website.crawlFailures.set(busyPdf, UrlCrawlFailureKind.TRANSIENT);
    harness.website.crawlFailures.set(gone, UrlCrawlFailureKind.GONE);
    // Linked only from the busy page, so this crawl does not reach it.
    harness.website.unlink(behindBusy);
    await aMomentLater();

    expect(await synced(harness)).toMatchObject({ removed: 2 });
    expect(documents(harness).map(({ name }) => name)).toEqual([
      'Bürgerservice',
      'Formular',
      'Startseite',
    ]);
    expect([fileOf(harness, busy), fileOf(harness, busyPdf)]).toEqual(kept);
  });

  it('keeps the document of a page that failed for now under the URL it is linked as, which redirects to its own', async () => {
    const harness = createWebSyncHarness();
    const rathaus = harness.website.page('rathaus/', {
      title: 'Rathaus',
      text: 'Öffnungszeiten',
    });
    await synced(harness);
    const kept = fileOf(harness, rathaus);

    harness.website.crawlFailures.set(rathaus, UrlCrawlFailureKind.TRANSIENT);
    harness.website.linkedAs.set(rathaus, 'https://musterstadt.de/rathaus');
    await aMomentLater();

    expect(await synced(harness)).toMatchObject({ removed: 0 });
    expect(fileOf(harness, rathaus)).toEqual(kept);
  });

  it('removes nothing while the website is unreachable and reports the failed sync with its last success until it is reachable again', async () => {
    const harness = createWebSyncHarness();
    harness.website.page('rathaus', {
      title: 'Rathaus',
      text: 'Öffnungszeiten',
    });
    await synced(harness);
    const lastSuccess = harness.repository.locations.get(
      harness.location.id,
    )?.lastSyncedAt;

    harness.website.rootReachable = false;
    await aMomentLater();

    expect(await harness.sync()).toEqual({
      outcome: SyncLocationOutcome.ACCESS_LOST,
    });
    expect(documents(harness)).toHaveLength(2);
    expect(harness.filesOf()).toHaveLength(2);
    expect(harness.repository.locations.get(harness.location.id)).toMatchObject(
      {
        state: SyncedLocationState.NO_LONGER_ACCESSIBLE,
        lastSyncedAt: lastSuccess,
      },
    );

    harness.website.rootReachable = true;
    await synced(harness);

    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.ACTIVE,
    );
  });

  it('fails the run instead of reporting the website unreachable when the crawl fails for a reason of ours', async () => {
    const harness = createWebSyncHarness();
    await synced(harness);
    harness.website.rootReachable = false;
    harness.website.rootError = new UnexpectedUrlRetrieverError(
      new Error('connection to the database lost'),
    );

    await expect(harness.sync()).rejects.toBeInstanceOf(
      UnexpectedUrlRetrieverError,
    );
    expect(documents(harness)).toHaveLength(1);
    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.ACTIVE,
    );
  });

  it('syncs with connectors switched off', async () => {
    const harness = createWebSyncHarness({ connectorsEnabled: false });

    expect(await synced(harness)).toMatchObject({ added: 1 });
  });

  it("lets pages and PDFs beyond the knowledge base's limit wait for room", async () => {
    const harness = createWebSyncHarness();
    harness.knowledgeBase.upload(KnowledgeBasesConstants.MAX_SOURCES - 2);
    harness.website.page('rathaus', {
      title: 'Rathaus',
      text: 'Öffnungszeiten',
    });
    harness.website.pdf('hundesteuer.pdf', 'Hundesteuer');

    expect(await synced(harness)).toMatchObject({
      added: 2,
      notSyncedLimitReached: 1,
    });
    expect(
      harness
        .filesOf()
        .filter(({ state }) => state === SyncedFileState.AWAITING_CAPACITY),
    ).toHaveLength(1);
  });

  describe('reading a page or PDF', () => {
    async function readAfterSync(url: string, error: Error) {
      const harness = createWebSyncHarness();
      harness.website.readErrors.set(url, error);
      await synced(harness);
      return harness.sources.fetchItemContent(
        harness.location,
        fileOf(harness, url),
      );
    }

    it.each([
      [
        'answers 404',
        new UrlRetrieverHttpError(WEBSITE, 404),
        { outcome: SyncSourceOutcome.GONE },
      ],
      [
        'is no longer HTML or text',
        new UrlRetrieverUnsupportedContentTypeError(WEBSITE, 'image/png'),
        {
          outcome: SyncSourceOutcome.UNPROCESSABLE,
          reason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
        },
      ],
      [
        'is too large to download',
        new UrlRetrieverContentTooLargeError(WEBSITE, 25 * 1024 * 1024),
        {
          outcome: SyncSourceOutcome.UNPROCESSABLE,
          reason: SyncedFileSkipReason.TOO_LARGE,
        },
      ],
    ])('settles a page that %s', async (_case, error, outcome) => {
      expect(await readAfterSync(WEBSITE, error)).toEqual(outcome);
    });

    it.each([
      ['answers 503', new UrlRetrieverHttpError(WEBSITE, 503)],
      ['times out', new UrlRetrieverTimeoutError(WEBSITE, 30_000)],
    ])(
      'fails, to be retried, when a page %s, so its document keeps its version',
      async (_case, error) => {
        await expect(readAfterSync(WEBSITE, error)).rejects.toBe(error);
      },
    );
  });
});
