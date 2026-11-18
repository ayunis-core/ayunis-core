import { ConnectorSyncOutcome } from 'src/domain/connectors/application/models/connector-sync-results';
import { ConnectorItemUnprocessableReason } from 'src/domain/connectors/domain/sync/connector-item';
import { createSyncHarness } from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { SyncLocationOutcome } from './sync-location.result';

type Harness = ReturnType<typeof createSyncHarness>;

async function synced(harness: Harness) {
  const result = await harness.sync();
  if (result.outcome !== SyncLocationOutcome.SYNCED)
    throw new Error(`Expected a sync, got ${result.outcome}`);
  return result.summary;
}

/** A sync records its time; a real one takes longer than a millisecond. */
const aMomentLater = () => new Promise((resolve) => setTimeout(resolve, 5));

function fileAt(harness: Harness, path: string) {
  const file = harness.filesOf().find((candidate) => candidate.path === path);
  if (!file) throw new Error(`No file at ${path}`);
  return file;
}

/** What a user sees, independent of generated IDs. */
function endState(harness: Harness) {
  return {
    documents: harness.knowledgeBase.names(),
    files: harness
      .filesOf()
      .map((file) => ({
        path: file.path,
        version: file.version,
        state: file.state,
        skipReason: file.skipReason,
        document: file.sourceId
          ? harness.knowledgeBase.documents.get(file.sourceId)?.name
          : null,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

describe('SyncLocationUseCase', () => {
  it('creates one document per file on the first sync and queues each file', async () => {
    const harness = createSyncHarness();
    harness.system.add('Satzungen/Hundesteuer.pdf');
    harness.system.add('Satzungen/Archiv/2019/Gebühren.docx');
    harness.system.add('Haushalt.xlsx');

    expect(await synced(harness)).toMatchObject({ added: 3 });
    expect(harness.knowledgeBase.names()).toEqual([
      'Gebühren.docx',
      'Haushalt.xlsx',
      'Hundesteuer.pdf',
    ]);
    expect(
      harness
        .filesOf()
        .every((file) => file.state === SyncedFileState.IMPORTED),
    ).toBe(true);
    expect(new Set(harness.jobs.map((job) => job.syncedFileId))).toEqual(
      new Set(harness.filesOf().map((file) => file.id)),
    );
    expect(harness.jobs).toHaveLength(3);
  });

  it('changes nothing on a second sync without changes in the source', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    const before = endState(harness);

    expect(await synced(harness)).toEqual({
      added: 0,
      removed: 0,
      relabelled: 0,
      contentChanged: 0,
      skipped: 0,
      notSyncedLimitReached: 0,
    });
    expect(endState(harness)).toEqual(before);
    expect(harness.jobs).toHaveLength(1);
  });

  it('only relabels a renamed or moved file, keeping its document and queueing nothing', async () => {
    const harness = createSyncHarness();
    const renamed = harness.system.add('Satzungen/Hundesteuer.pdf');
    const moved = harness.system.add('Satzungen/Gebühren.pdf');
    await synced(harness);
    const renamedDocument = fileAt(
      harness,
      'Satzungen/Hundesteuer.pdf',
    ).sourceId;
    const movedDocument = fileAt(harness, 'Satzungen/Gebühren.pdf').sourceId;

    harness.system.relabel(renamed, 'Satzungen/Hundesteuersatzung 2024.pdf');
    harness.system.relabel(moved, 'Archiv/Gebühren.pdf');

    expect(await synced(harness)).toMatchObject({
      relabelled: 2,
      contentChanged: 0,
      added: 0,
    });
    expect(
      fileAt(harness, 'Satzungen/Hundesteuersatzung 2024.pdf').sourceId,
    ).toBe(renamedDocument);
    expect(fileAt(harness, 'Archiv/Gebühren.pdf').sourceId).toBe(movedDocument);
    expect(harness.knowledgeBase.names()).toEqual([
      'Gebühren.pdf',
      'Hundesteuersatzung 2024.pdf',
    ]);
    expect(harness.jobs).toHaveLength(2);
  });

  it('keeps the document of a changed file and queues its new version', async () => {
    const harness = createSyncHarness();
    const id = harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    const document = fileAt(harness, 'Hundesteuer.pdf').sourceId;

    harness.system.edit(id);

    expect(await synced(harness)).toMatchObject({
      contentChanged: 1,
      added: 0,
    });
    const file = fileAt(harness, 'Hundesteuer.pdf');
    expect(file.sourceId).toBe(document);
    expect(harness.knowledgeBase.documents.has(document!)).toBe(true);
    expect(harness.jobs.at(-1)).toMatchObject({
      syncedFileId: file.id,
      version: file.version,
    });
  });

  it('removes the documents of deleted files and ignores deletions of unknown items', async () => {
    const harness = createSyncHarness();
    const deleted = harness.system.add('Hundesteuer.pdf');
    harness.system.add('Gebühren.pdf');
    await synced(harness);
    const document = fileAt(harness, 'Hundesteuer.pdf').sourceId!;

    harness.system.remove(deleted);
    harness.system.removeUnknown();

    expect(await synced(harness)).toMatchObject({ removed: 1 });
    expect(harness.knowledgeBase.documents.has(document)).toBe(false);
    expect(harness.knowledgeBase.names()).toEqual(['Gebühren.pdf']);
    expect(harness.filesOf().map((file) => file.path)).toEqual([
      'Gebühren.pdf',
    ]);
  });

  it('reaches the same end state through a demanded full resync as through incremental syncs', async () => {
    async function run(resync: boolean) {
      const harness = createSyncHarness();
      const renamed = harness.system.add('Satzungen/Hundesteuer.pdf');
      const deleted = harness.system.add('Satzungen/Alt.pdf');
      const edited = harness.system.add('Haushalt.xlsx');
      await synced(harness);
      harness.system.relabel(renamed, 'Satzungen/Hundesteuer 2024.pdf');
      harness.system.remove(deleted);
      harness.system.edit(edited);
      harness.system.add('Neu/Bebauungsplan.pdf');
      harness.system.resyncDemanded = resync;
      await synced(harness);
      return endState(harness);
    }

    const incremental = await run(false);

    expect(await run(true)).toEqual(incremental);
    expect(incremental.documents).toEqual([
      'Bebauungsplan.pdf',
      'Haushalt.xlsx',
      'Hundesteuer 2024.pdf',
    ]);
  });

  it('adds only as many files as the shared limit allows and the rest once documents are removed', async () => {
    const harness = createSyncHarness();
    harness.knowledgeBase.upload(490);
    for (let index = 0; index < 20; index++)
      harness.system.add(
        `Massentest/Datei ${String(index).padStart(2, '0')}.txt`,
      );

    expect(await synced(harness)).toMatchObject({
      added: 10,
      notSyncedLimitReached: 10,
    });
    expect(harness.knowledgeBase.documents.size).toBe(500);

    const uploads = [...harness.knowledgeBase.documents.entries()]
      .filter(([, document]) => document.name.startsWith('Upload'))
      .slice(0, 10);
    for (const [id] of uploads) harness.knowledgeBase.removeDocument(id);

    expect(await synced(harness)).toMatchObject({
      added: 10,
      notSyncedLimitReached: 0,
    });
    expect(
      harness
        .filesOf()
        .every((file) => file.state === SyncedFileState.IMPORTED),
    ).toBe(true);
    expect(harness.knowledgeBase.documents.size).toBe(500);
  });

  it('skips unprocessable files with their reason, outside the limit, until they change', async () => {
    const harness = createSyncHarness();
    harness.knowledgeBase.upload(499);
    harness.system.add('Nicht verarbeitbar/Fotos.zip');
    harness.system.add('Nicht verarbeitbar/Plan.pdf', {
      size: 150 * 1024 * 1024,
    });
    const encrypted = harness.system.add('Nicht verarbeitbar/Vertraulich.pdf', {
      unprocessable: ConnectorItemUnprocessableReason.ENCRYPTED,
    });
    harness.system.add('Hundesteuer.pdf');

    expect(await synced(harness)).toMatchObject({
      added: 1,
      skipped: 3,
      notSyncedLimitReached: 0,
    });
    expect(endState(harness).files.filter((f) => f.skipReason)).toEqual([
      expect.objectContaining({
        path: 'Nicht verarbeitbar/Fotos.zip',
        skipReason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
        document: null,
      }),
      expect.objectContaining({
        path: 'Nicht verarbeitbar/Plan.pdf',
        skipReason: SyncedFileSkipReason.TOO_LARGE,
      }),
      expect.objectContaining({
        path: 'Nicht verarbeitbar/Vertraulich.pdf',
        skipReason: SyncedFileSkipReason.ENCRYPTED,
      }),
    ]);
    harness.knowledgeBase.removeDocument(
      [...harness.knowledgeBase.documents.keys()][0],
    );
    expect(await synced(harness)).toMatchObject({ added: 0, skipped: 3 });

    harness.system.edit(encrypted, { unprocessableReason: undefined });

    expect(await synced(harness)).toMatchObject({ added: 1, skipped: 2 });
    expect(fileAt(harness, 'Nicht verarbeitbar/Vertraulich.pdf').state).toBe(
      SyncedFileState.IMPORTED,
    );
  });

  it('skips a file waiting for room once it is reported unprocessable, even at the same version', async () => {
    const harness = createSyncHarness();
    harness.knowledgeBase.upload(500);
    const id = harness.system.add('Vertraulich.pdf');
    await synced(harness);
    harness.system.edit(id, {
      version: fileAt(harness, 'Vertraulich.pdf').version,
      unprocessableReason: ConnectorItemUnprocessableReason.ENCRYPTED,
    });
    harness.knowledgeBase.removeDocument(
      [...harness.knowledgeBase.documents.keys()][0],
    );

    expect(await synced(harness)).toMatchObject({ added: 0, skipped: 1 });
    expect(fileAt(harness, 'Vertraulich.pdf')).toMatchObject({
      state: SyncedFileState.SKIPPED,
      skipReason: SyncedFileSkipReason.ENCRYPTED,
    });
  });

  it('imports a file the provider listed twice in one round, first as unprocessable, as its last listing tells', async () => {
    const harness = createSyncHarness();
    harness.system.add('Vertraulich.pdf');
    const list = harness.system.listChanges.bind(harness.system);
    harness.system.listChanges = async (cursor) => {
      const listing = await list(cursor);
      if (listing.outcome !== ConnectorSyncOutcome.CHANGES) return listing;
      const [item] = listing.items;
      return {
        ...listing,
        items: [
          {
            ...item,
            unprocessableReason: ConnectorItemUnprocessableReason.ENCRYPTED,
          },
          item,
        ],
      };
    };

    expect(await synced(harness)).toMatchObject({ added: 1, skipped: 0 });
    expect(fileAt(harness, 'Vertraulich.pdf')).toMatchObject({
      state: SyncedFileState.IMPORTED,
      skipReason: null,
    });
  });

  it('removes the document of a file whose new version cannot be processed', async () => {
    const harness = createSyncHarness();
    const id = harness.system.add('Plan.pdf');
    await synced(harness);
    const document = fileAt(harness, 'Plan.pdf').sourceId!;

    harness.system.edit(id, { size: 150 * 1024 * 1024 });

    expect(await synced(harness)).toMatchObject({ skipped: 1 });
    expect(harness.knowledgeBase.documents.has(document)).toBe(false);
    expect(fileAt(harness, 'Plan.pdf')).toMatchObject({
      state: SyncedFileState.SKIPPED,
      skipReason: SyncedFileSkipReason.TOO_LARGE,
      sourceId: null,
    });
  });

  it('imports a file again whose document a user removed', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    harness.knowledgeBase.removeDocument(
      fileAt(harness, 'Hundesteuer.pdf').sourceId!,
    );

    expect(await synced(harness)).toMatchObject({ added: 1 });
    expect(harness.knowledgeBase.names()).toEqual(['Hundesteuer.pdf']);
    expect(harness.jobs.at(-1)?.sourceId).toBe(
      fileAt(harness, 'Hundesteuer.pdf').sourceId,
    );
  });

  it('marks the location no longer accessible when access is lost, keeps its documents and resumes once restored', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    harness.system.accessGranted = false;
    harness.system.add('Gebühren.pdf');

    expect(await harness.sync()).toEqual({
      outcome: SyncLocationOutcome.ACCESS_LOST,
    });
    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.NO_LONGER_ACCESSIBLE,
    );
    expect(harness.knowledgeBase.names()).toEqual(['Hundesteuer.pdf']);

    harness.system.accessGranted = true;

    expect(await synced(harness)).toMatchObject({ added: 1 });
    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.ACTIVE,
    );
    expect(harness.knowledgeBase.names()).toEqual([
      'Gebühren.pdf',
      'Hundesteuer.pdf',
    ]);
  });

  it('applies nothing from a listing made before a newer sync was recorded', async () => {
    const harness = createSyncHarness();
    const deleted = harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    const release = harness.system.holdNextListing();
    const stale = harness.sync();
    harness.system.remove(deleted);
    harness.system.add('Gebühren.pdf');
    await aMomentLater();
    await synced(harness);
    release();

    expect(await stale).toEqual({ outcome: SyncLocationOutcome.SUPERSEDED });
    expect(harness.knowledgeBase.names()).toEqual(['Gebühren.pdf']);
  });

  it('does not mark the location inaccessible from an outdated listing', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    await synced(harness);
    harness.system.accessGranted = false;
    const release = harness.system.holdNextListing();
    const stale = harness.sync();
    harness.system.accessGranted = true;
    await aMomentLater();
    await synced(harness);
    release();
    await stale;

    expect(harness.repository.locations.get(harness.location.id)?.state).toBe(
      SyncedLocationState.ACTIVE,
    );
  });

  it('queues the files of a failed enqueue on the next sync', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    harness.queue.failing = true;
    await expect(harness.sync()).rejects.toThrow('Redis unavailable');
    harness.queue.failing = false;

    expect(await synced(harness)).toMatchObject({ added: 0 });
    expect(harness.jobs).toEqual([
      expect.objectContaining({
        sourceId: fileAt(harness, 'Hundesteuer.pdf').sourceId,
      }),
    ]);
  });

  it('syncs nothing while connectors are switched off', async () => {
    const harness = createSyncHarness({ connectorsEnabled: false });
    harness.system.add('Hundesteuer.pdf');

    expect(await harness.sync()).toEqual({
      outcome: SyncLocationOutcome.DISABLED,
    });
    expect(harness.knowledgeBase.documents.size).toBe(0);
    expect(
      harness.repository.locations.get(harness.location.id)?.cursor,
    ).toBeNull();
  });
});
