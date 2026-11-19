import {
  SharePointLocationKind,
  SharePointResolutionOutcome as Outcome,
} from 'src/domain/connectors/application/models/sharepoint-location';
import {
  FakeSharePoint,
  HOST,
} from 'src/domain/connectors/application/testing/fake-sharepoint.fixtures';
import { SharePointGrantScope } from 'src/domain/connectors/domain/microsoft-365/sharepoint-grant';
import { parseSharePointUrl } from 'src/domain/connectors/domain/microsoft-365/sharepoint-url';
import { SharePointLocationResolver } from './sharepoint-location-resolver.service';

const CLIENT_ID = '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a';
const SITE_URL = `https://${HOST}/sites/bauamt`;

function setUp() {
  const graph = new FakeSharePoint();
  const site = graph.site('sites/bauamt', 'Bauamt');
  const documents = graph.library(site, 'Dokumente', 'Freigegebene Dokumente');
  const resolver = new SharePointLocationResolver(graph);
  return {
    graph,
    site,
    documents,
    resolve: (url: string) =>
      resolver.resolve('graph-token', parseSharePointUrl(url)!, CLIENT_ID),
  };
}

describe('SharePointLocationResolver', () => {
  it('resolves a site, a library by its localized URL and a folder from a library view', async () => {
    const { graph, site, documents, resolve } = setUp();
    const plaene = graph.library(site, 'Pläne', 'Plne');
    const archiv = graph.folder(documents, 'Satzungen/Archiv');

    expect(await resolve(SITE_URL)).toMatchObject({
      outcome: Outcome.FOUND,
      target: {
        kind: SharePointLocationKind.SITE,
        siteId: site.id,
        name: 'Bauamt',
      },
    });
    expect(await resolve(`${SITE_URL}/Plne/Forms/AllItems.aspx`)).toMatchObject(
      {
        outcome: Outcome.FOUND,
        target: {
          kind: SharePointLocationKind.LIBRARY,
          driveId: plaene.id,
          name: 'Pläne',
        },
      },
    );
    expect(
      await resolve(
        `${SITE_URL}/Freigegebene%20Dokumente/Forms/AllItems.aspx?id=%2Fsites%2Fbauamt%2FFreigegebene%20Dokumente%2FSatzungen%2FArchiv&viewid=1`,
      ),
    ).toMatchObject({
      outcome: Outcome.FOUND,
      target: {
        kind: SharePointLocationKind.FOLDER,
        driveId: documents.id,
        itemId: archiv,
        name: 'Archiv',
      },
    });
  });

  it('tells a site that is not granted, with the command that grants it to the app', async () => {
    const { graph, resolve } = setUp();
    graph.site('sites/nicht-freigegeben').granted = false;

    expect(
      await resolve(
        `https://${HOST}/sites/nicht-freigegeben/Freigegebene%20Dokumente`,
      ),
    ).toEqual({
      outcome: Outcome.NOT_GRANTED,
      grant: {
        scope: SharePointGrantScope.SITE,
        command: [
          'Connect-MgGraph -Scopes "Sites.FullControl.All"',
          `Invoke-MgGraphRequest -Method POST -Uri 'https://graph.microsoft.com/v1.0/sites/${HOST}:/sites/nicht-freigegeben:/permissions' -Body '{"roles":["read"],"grantedToIdentities":[{"application":{"id":"${CLIENT_ID}","displayName":"Ayunis"}}]}'`,
        ].join('\n'),
      },
    });
  });

  it('tells a site that does not exist, also on the host of another tenant', async () => {
    const { resolve } = setUp();

    expect(await resolve(`https://${HOST}/sites/gibt-es-nicht`)).toEqual({
      outcome: Outcome.NOT_FOUND,
    });
    expect(
      await resolve('https://andere-stadt.sharepoint.com/sites/bauamt'),
    ).toEqual({
      outcome: Outcome.NOT_FOUND,
    });
  });

  it('tells a missing folder as not found where the app sees everything around it', async () => {
    const { graph, documents, resolve } = setUp();
    graph.folder(documents, 'Satzungen');

    expect(
      await resolve(
        `${SITE_URL}/Freigegebene%20Dokumente/Satzungen/Gibt-es-nicht`,
      ),
    ).toEqual({
      outcome: Outcome.NOT_FOUND,
    });
  });

  it('cannot tell a folder that is not granted from a missing one where the app sees only parts, and offers the command that grants the folder', async () => {
    const { graph, documents, resolve } = setUp();
    graph.folder(documents, 'Freigegeben');
    graph.folder(documents, "Intern's", { hidden: true });

    const intern = await resolve(
      `${SITE_URL}/Freigegebene%20Dokumente/Intern's`,
    );
    const missing = await resolve(
      `${SITE_URL}/Freigegebene%20Dokumente/Gibt-es-nicht`,
    );

    expect(intern).toEqual({
      outcome: Outcome.NOT_FOUND_OR_NOT_GRANTED,
      grant: {
        scope: SharePointGrantScope.FOLDER,
        command: [
          'Connect-MgGraph -Scopes "Sites.FullControl.All"',
          `Invoke-MgGraphRequest -Method POST -Uri 'https://graph.microsoft.com/v1.0/drives/${documents.id}/root:/Intern''s:/permissions' -Body '{"roles":["read"],"grantedToV2":{"application":{"id":"${CLIENT_ID}"}}}'`,
        ].join('\n'),
      },
    });
    expect(missing.outcome).toBe(Outcome.NOT_FOUND_OR_NOT_GRANTED);
  });

  it('cannot tell a library it does not see from a missing one, and offers the site grant', async () => {
    const { resolve } = setUp();

    expect(await resolve(`${SITE_URL}/Gibt-es-nicht`)).toMatchObject({
      outcome: Outcome.NOT_FOUND_OR_NOT_GRANTED,
      grant: { scope: SharePointGrantScope.SITE },
    });
  });

  it('resolves a subsite and the libraries and folders in it, not only those of the site collection', async () => {
    const { graph, resolve } = setUp();
    const archiv = graph.site('sites/bauamt/archiv', 'Archiv');
    const akten = graph.library(archiv, 'Akten');
    const jahrgang = graph.folder(akten, '2024');

    expect(await resolve(`${SITE_URL}/archiv`)).toMatchObject({
      outcome: Outcome.FOUND,
      target: { kind: SharePointLocationKind.SITE, siteId: archiv.id },
    });
    expect(await resolve(`${SITE_URL}/archiv/Akten/2024`)).toMatchObject({
      outcome: Outcome.FOUND,
      target: {
        kind: SharePointLocationKind.FOLDER,
        siteId: archiv.id,
        driveId: akten.id,
        itemId: jahrgang,
      },
    });
  });

  it('refuses the URL of a file', async () => {
    const { graph, documents, resolve } = setUp();
    graph.file(documents, 'Hundesteuer.pdf');

    expect(
      await resolve(`${SITE_URL}/Freigegebene%20Dokumente/Hundesteuer.pdf`),
    ).toEqual({
      outcome: Outcome.UNSUPPORTED_URL,
    });
  });
});
