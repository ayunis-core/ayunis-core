import type { GraphDriveItem } from 'src/domain/connectors/application/models/microsoft-graph-resources';
import type { SharePointCursor } from 'src/domain/connectors/application/models/sharepoint-cursor';
import type { MicrosoftGraphPort } from 'src/domain/connectors/application/ports/microsoft-graph.port';
import { SharePointListing } from './sharepoint-listing.service';

const DRIVE_ID = 'b!drive';
const FOLDER_ID = '01FOLDER';
const FILE_ID = '01FILE';
const DELTA_LINK = 'https://graph.microsoft.com/v1.0/delta?token=next';

/** Graph lists an item more than once when it changed during the query. */
const FILE_THEN_DELETED: GraphDriveItem[] = [
  { id: FOLDER_ID, name: 'Satzungen', folder: {} },
  {
    id: FILE_ID,
    name: 'Hundesteuer.pdf',
    parentReference: { id: FOLDER_ID },
    file: { hashes: { quickXorHash: 'hash-1' } },
    size: 1024,
  },
  { id: FILE_ID, deleted: {}, file: {} },
];

function listingAnswering(entries: GraphDriveItem[]): SharePointListing {
  const graph = {
    get: () =>
      Promise.resolve({
        status: 'ok',
        body: { value: entries, '@odata.deltaLink': DELTA_LINK },
      }),
  } as unknown as MicrosoftGraphPort;
  return new SharePointListing(graph);
}

const drive = { driveId: DRIVE_ID, folderId: FOLDER_ID, prefix: '' };

describe('SharePointListing', () => {
  it('does not list a file whose last delta entry deletes it', async () => {
    const listed = await listingAnswering(FILE_THEN_DELETED).full('token', {
      siteId: null,
      drives: [drive],
    });

    expect(listed.items).toEqual([]);
  });

  it('reports a file whose last delta entry deletes it only as removed', async () => {
    const cursor: SharePointCursor = {
      v: 1,
      siteId: null,
      drives: [
        { ...drive, rootId: FOLDER_ID, deltaLink: DELTA_LINK, folders: {} },
      ],
    };

    const changes = await listingAnswering(FILE_THEN_DELETED).changes(
      'token',
      cursor,
    );

    expect(changes.items).toEqual([]);
    expect(changes.removedItemIds).toEqual([`${DRIVE_ID}/${FILE_ID}`]);
  });
});
