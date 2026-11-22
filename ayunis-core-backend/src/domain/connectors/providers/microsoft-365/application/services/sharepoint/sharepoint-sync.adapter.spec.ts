import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import {
  ConnectorSyncOutcome,
  type ConnectorChanges,
  type ConnectorChangesResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import type { EntraAppToken } from 'src/domain/connectors/providers/microsoft-365/application/ports/entra-app-token.port';
import { EntraTokenRejection } from 'src/domain/connectors/providers/microsoft-365/application/ports/entra-app-token.port';
import { Microsoft365GraphTokensService } from 'src/domain/connectors/providers/microsoft-365/application/services/microsoft-365-graph-tokens.service';
import type { Microsoft365AppTokenService } from 'src/domain/connectors/providers/microsoft-365/application/services/microsoft-365-app-token.service';
import {
  DOCX,
  FakeSharePoint,
  HOST,
} from 'src/domain/connectors/providers/microsoft-365/application/testing/fake-sharepoint.fixtures';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorItemUnprocessableReason } from 'src/domain/connectors/domain/sync/connector-item';
import { SharePointListing } from './sharepoint-listing.service';
import { SharePointLocationResolver } from './sharepoint-location-resolver.service';
import { SharePointSyncAdapter } from './sharepoint-sync.adapter';

const SITE_URL = `https://${HOST}/sites/bauamt`;
const LIBRARY_URL = `${SITE_URL}/Freigegebene%20Dokumente`;
const COMPOUND_FILE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x3e,
]);

const issued: EntraAppToken = {
  status: 'issued',
  accessToken: 'graph-token',
  roles: ['Sites.Selected'],
  expiresAt: new Date(Date.now() + 3_600_000),
};

function setUp() {
  const graph = new FakeSharePoint();
  const site = graph.site('sites/bauamt', 'Bauamt');
  const documents = graph.library(site, 'Dokumente', 'Freigegebene Dokumente');
  const entra: { token: EntraAppToken; requests: number } = {
    token: issued,
    requests: 0,
  };
  const appTokens = {
    requestToken: () => {
      entra.requests++;
      return Promise.resolve(entra.token);
    },
  } as unknown as Microsoft365AppTokenService;
  const adapter = new SharePointSyncAdapter(
    new Microsoft365GraphTokensService(appTokens),
    graph,
    new SharePointLocationResolver(graph),
    new SharePointListing(graph),
  );
  const connector = new Connector({
    orgId: randomUUID(),
    product: ConnectorProduct.MICROSOFT_365,
    setup: { tenantId: randomUUID(), clientId: randomUUID() },
    encryptedCredentials: 'encrypted',
  });
  let cursor: string | null = null;
  return {
    graph,
    site,
    documents,
    entra,
    connector,
    adapter,
    /** Lists like the engine: with the cursor of the previous listing. */
    async list(location: string): Promise<ConnectorChangesResult> {
      const result = await adapter.listChanges(connector, location, cursor);
      if (result.outcome === ConnectorSyncOutcome.CHANGES)
        cursor = result.cursor;
      return result;
    },
  };
}

function changes(result: ConnectorChangesResult): ConnectorChanges {
  if (result.outcome !== ConnectorSyncOutcome.CHANGES)
    throw new Error(`Expected changes, got ${result.outcome}`);
  return result;
}

function paths(result: ConnectorChangesResult): string[] {
  return changes(result)
    .items.map((item) => item.path)
    .sort((a, b) => a.localeCompare(b));
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

describe('SharePointSyncAdapter', () => {
  describe('listing', () => {
    it('lists every file below a folder, also in nested folders, with paths below the folder and nothing beside it', async () => {
      const { graph, documents, list } = setUp();
      graph.file(documents, 'Satzungen/Gebührensatzung.docx');
      graph.file(documents, 'Satzungen/Archiv/2019/Stellplatzsatzung 2019.pdf');
      graph.file(documents, 'Formulare/Checkliste Bauantrag.docx');

      const listed = await list(`${LIBRARY_URL}/Satzungen`);

      expect(changes(listed).fullListing).toBe(true);
      expect(paths(listed)).toEqual([
        'Archiv/2019/Stellplatzsatzung 2019.pdf',
        'Gebührensatzung.docx',
      ]);
    });

    it('never lists files in a folder that is not granted, in a library granted in parts', async () => {
      const { graph, documents, list } = setUp();
      graph.file(documents, 'Freigegeben/Dienstanweisung.docx');
      graph.folder(documents, 'Intern', { hidden: true });
      graph.file(documents, 'Intern/VERTRAULICH.docx');

      expect(paths(await list(LIBRARY_URL))).toEqual([
        'Freigegeben/Dienstanweisung.docx',
      ]);
    });

    it("lists a site's document libraries with each library's name in front of the paths", async () => {
      const { graph, site, documents, list } = setUp();
      graph.file(documents, 'Satzungen/Gebührensatzung.docx');
      graph.file(graph.library(site, 'Pläne', 'Plne'), 'Bebauungsplan.pdf');

      expect(paths(await list(SITE_URL))).toEqual([
        'Dokumente/Satzungen/Gebührensatzung.docx',
        'Pläne/Bebauungsplan.pdf',
      ]);
    });

    it('follows every page of a large library', async () => {
      const { graph, site, list } = setUp();
      const massentest = graph.library(site, 'Massentest');
      for (let n = 1; n <= 520; n++)
        graph.file(massentest, `Aktennotiz ${n}.txt`);
      graph.pageSize = 200;

      expect(changes(await list(`${SITE_URL}/Massentest`)).items).toHaveLength(
        520,
      );
    });

    it('reports only what changed since the last listing: new content as a new version, a rename or move with the same version and the new path, a deletion by ID', async () => {
      const { graph, documents, list } = setUp();
      const changed = graph.file(documents, 'Satzungen/Hundesteuer.pdf');
      const renamed = graph.file(documents, 'Satzungen/Gebühren.docx');
      const moved = graph.file(documents, 'Satzungen/Parken.pdf');
      const deleted = graph.file(documents, 'Satzungen/Alt.pdf');
      graph.file(documents, 'Satzungen/Unverändert.pdf');
      const archiv = graph.folder(documents, 'Satzungen/Archiv');
      const first = changes(await list(LIBRARY_URL));
      const versionOf = (id: string) =>
        first.items.find((item) => item.id.endsWith(`/${id}`))!.version;

      graph.edit(documents, changed);
      graph.rename(documents, renamed, 'Gebühren 2026.docx');
      graph.move(documents, moved, archiv);
      graph.remove(documents, deleted);
      graph.file(documents, 'Neu/Unterordner/Neu.pdf');
      const next = changes(await list(LIBRARY_URL));

      expect(next.fullListing).toBe(false);
      expect(
        next.items
          .map(({ path, version }) => ({ path, version }))
          .sort((a, b) => a.path.localeCompare(b.path)),
      ).toEqual([
        { path: 'Neu/Unterordner/Neu.pdf', version: expect.any(String) },
        { path: 'Satzungen/Archiv/Parken.pdf', version: versionOf(moved) },
        { path: 'Satzungen/Gebühren 2026.docx', version: versionOf(renamed) },
        { path: 'Satzungen/Hundesteuer.pdf', version: expect.any(String) },
      ]);
      expect(
        next.items.find((item) => item.id.endsWith(`/${changed}`))!.version,
      ).not.toBe(versionOf(changed));
      expect(next.removedItemIds).toEqual([
        first.items.find((item) => item.id.endsWith(`/${deleted}`))!.id,
      ]);
    });

    it('gives every file of a renamed folder its new path, though Graph reports the folder without them', async () => {
      const { graph, documents, list } = setUp();
      const satzungen = graph.folder(documents, 'Satzungen');
      graph.file(documents, 'Satzungen/Archiv/Stellplatzsatzung.pdf');
      const first = changes(await list(LIBRARY_URL));

      graph.rename(documents, satzungen, 'Satzungen und Verordnungen');
      const next = changes(await list(LIBRARY_URL));

      expect(next.fullListing).toBe(true);
      expect(next.items).toEqual([
        {
          ...first.items[0],
          path: 'Satzungen und Verordnungen/Archiv/Stellplatzsatzung.pdf',
        },
      ]);
    });

    it('removes the files of a deleted folder', async () => {
      const { graph, documents, list } = setUp();
      const archiv = graph.folder(documents, 'Archiv');
      graph.file(documents, 'Archiv/Alt.pdf');
      graph.file(documents, 'Aktuell.pdf');
      await list(LIBRARY_URL);

      graph.remove(documents, archiv);

      expect(paths(await list(LIBRARY_URL))).toEqual(['Aktuell.pdf']);
    });

    it('removes a file moved out of a folder location', async () => {
      const { graph, documents, list } = setUp();
      const file = graph.file(documents, 'Satzungen/Hundesteuer.pdf');
      graph.file(documents, 'Satzungen/Gebühren.pdf');
      const first = changes(await list(`${LIBRARY_URL}/Satzungen`));

      graph.move(documents, file, documents.rootId);
      const next = changes(await list(`${LIBRARY_URL}/Satzungen`));

      // Graph demands a resync of the folder; the full listing leaves it out.
      expect(next.fullListing).toBe(true);
      expect(next.items.map((item) => item.path)).toEqual(['Gebühren.pdf']);
      expect(first.items.map((item) => item.path)).toContain('Hundesteuer.pdf');
    });

    it('starts over with everything when Graph demands a resync', async () => {
      const { graph, documents, list } = setUp();
      graph.file(documents, 'Hundesteuer.pdf');
      await list(LIBRARY_URL);

      graph.resyncDemanded = true;
      const next = changes(await list(LIBRARY_URL));

      expect(next.fullListing).toBe(true);
      expect(next.items.map((item) => item.path)).toEqual(['Hundesteuer.pdf']);
    });

    it('lists a library added to a site location', async () => {
      const { graph, site, documents, list } = setUp();
      graph.file(documents, 'Hundesteuer.pdf');
      await list(SITE_URL);

      graph.file(graph.library(site, 'Pläne', 'Plne'), 'Bebauungsplan.pdf');
      const next = changes(await list(SITE_URL));

      expect(next.fullListing).toBe(true);
      expect(paths(next)).toEqual([
        'Dokumente/Hundesteuer.pdf',
        'Pläne/Bebauungsplan.pdf',
      ]);
    });

    it('reports access lost when the grant is revoked, and lists again once it is back', async () => {
      const { graph, site, documents, list } = setUp();
      graph.file(documents, 'Hundesteuer.pdf');
      await list(LIBRARY_URL);

      site.granted = false;
      expect((await list(LIBRARY_URL)).outcome).toBe(
        ConnectorSyncOutcome.ACCESS_LOST,
      );
      site.granted = true;
      graph.file(documents, 'Neu.pdf');
      expect(paths(await list(LIBRARY_URL))).toEqual(['Neu.pdf']);
    });

    it('reports access lost when the location cannot be found any more on its first listing', async () => {
      const { list } = setUp();

      expect((await list(`${LIBRARY_URL}/Gibt es nicht`)).outcome).toBe(
        ConnectorSyncOutcome.ACCESS_LOST,
      );
    });

    it('reports access lost when Entra rejects the credentials', async () => {
      const { entra, list } = setUp();
      entra.token = {
        status: 'rejected',
        reason: EntraTokenRejection.CLIENT_SECRET_EXPIRED,
        errorCode: 'AADSTS7000222',
      };

      expect((await list(LIBRARY_URL)).outcome).toBe(
        ConnectorSyncOutcome.ACCESS_LOST,
      );
    });

    it('passes on when Graph throttles, so the engine backs off', async () => {
      const { graph, list } = setUp();
      const retryAt = new Date(Date.now() + 120_000);
      graph.throttledUntil = retryAt;

      expect(await list(LIBRARY_URL)).toEqual({
        outcome: ConnectorSyncOutcome.THROTTLED,
        retryAt,
      });
    });
  });

  describe('content', () => {
    it("reads a file's content with its size", async () => {
      const { graph, documents, connector, adapter, list } = setUp();
      graph.file(documents, 'Hundesteuer.pdf', {
        content: Buffer.from('%PDF-1.7 Hundesteuer'),
      });
      const [item] = changes(await list(LIBRARY_URL)).items;

      const content = await adapter.fetchContent(
        connector,
        LIBRARY_URL,
        item.id,
      );

      if (content.outcome !== ConnectorSyncOutcome.CONTENT)
        throw new Error(content.outcome);
      expect(content.size).toBe(20);
      expect((await readAll(content.content)).toString()).toBe(
        '%PDF-1.7 Hundesteuer',
      );
    });

    it('reports a Word document encrypted by a sensitivity label as encrypted, not as content', async () => {
      const { graph, documents, connector, adapter, list } = setUp();
      graph.file(documents, 'Personalakte.docx', {
        content: COMPOUND_FILE,
        contentType: DOCX,
      });
      const [item] = changes(await list(LIBRARY_URL)).items;

      expect(
        await adapter.fetchContent(connector, LIBRARY_URL, item.id),
      ).toEqual({
        outcome: ConnectorSyncOutcome.UNPROCESSABLE,
        reason: ConnectorItemUnprocessableReason.ENCRYPTED,
      });
    });

    it('reads a legacy Excel file, which is a compound file too', async () => {
      const { graph, documents, connector, adapter, list } = setUp();
      graph.file(documents, 'Haushalt.xls', {
        content: COMPOUND_FILE,
        contentType: 'application/vnd.ms-excel',
      });
      const [item] = changes(await list(LIBRARY_URL)).items;

      const content = await adapter.fetchContent(
        connector,
        LIBRARY_URL,
        item.id,
      );

      if (content.outcome !== ConnectorSyncOutcome.CONTENT)
        throw new Error(content.outcome);
      expect(await readAll(content.content)).toEqual(COMPOUND_FILE);
    });

    it('reports a deleted file as gone and a revoked grant as access lost', async () => {
      const { graph, site, documents, connector, adapter, list } = setUp();
      const id = graph.file(documents, 'Hundesteuer.pdf');
      graph.file(documents, 'Gebühren.pdf');
      const items = changes(await list(LIBRARY_URL)).items;
      const deleted = items.find((item) => item.id.endsWith(`/${id}`))!;
      const other = items.find((item) => item !== deleted)!;

      graph.remove(documents, id);
      expect(
        (await adapter.fetchContent(connector, LIBRARY_URL, deleted.id))
          .outcome,
      ).toBe(ConnectorSyncOutcome.GONE);
      site.granted = false;
      expect(
        (await adapter.fetchContent(connector, LIBRARY_URL, other.id)).outcome,
      ).toBe(ConnectorSyncOutcome.ACCESS_LOST);
    });

    it('fails a single file Graph refuses without losing access to its still granted location', async () => {
      const { graph, documents, connector, adapter, list } = setUp();
      const id = graph.file(documents, 'Verdächtig.pdf');
      const [item] = changes(await list(LIBRARY_URL)).items;
      documents.items.get(id)!.forbidden = true;

      await expect(
        adapter.fetchContent(connector, LIBRARY_URL, item.id),
      ).rejects.toThrow('403');
    });

    it('asks Entra for one token for a whole sync, not one per file', async () => {
      const { graph, documents, entra, connector, adapter, list } = setUp();
      graph.file(documents, 'a.pdf');
      graph.file(documents, 'b.pdf');
      const { items } = changes(await list(LIBRARY_URL));

      for (const item of items) {
        const content = await adapter.fetchContent(
          connector,
          LIBRARY_URL,
          item.id,
        );
        if (content.outcome === ConnectorSyncOutcome.CONTENT)
          content.content.destroy();
      }

      expect(entra.requests).toBe(1);
    });
  });
});
