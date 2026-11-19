import { encodePathSegments } from './sharepoint-url';

export enum SharePointGrantScope {
  /** `Sites.Selected`: the whole site. */
  SITE = 'site',
  /** `Files.SelectedOperations.Selected`: one folder and what is below it. */
  FOLDER = 'folder',
}

/**
 * What the Microsoft 365 admin runs to grant the organization's Entra app
 * read access to a SharePoint location: Microsoft Graph PowerShell, signed
 * in with `Sites.FullControl.All`.
 */
export interface SharePointGrant {
  scope: SharePointGrantScope;
  command: string;
}

const GRAPH = 'https://graph.microsoft.com/v1.0';
const APP_DISPLAY_NAME = 'Ayunis';

export function siteGrant(
  host: string,
  sitePath: string,
  clientId: string,
): SharePointGrant {
  const site = sitePath
    ? `${host}:/${encodePathSegments(sitePath.split('/'))}:`
    : host;
  return {
    scope: SharePointGrantScope.SITE,
    command: grantCommand(`${GRAPH}/sites/${site}/permissions`, {
      roles: ['read'],
      grantedToIdentities: [
        { application: { id: clientId, displayName: APP_DISPLAY_NAME } },
      ],
    }),
  };
}

export function folderGrant(
  driveId: string,
  folderPath: string[],
  clientId: string,
): SharePointGrant {
  return {
    scope: SharePointGrantScope.FOLDER,
    command: grantCommand(
      `${GRAPH}/drives/${encodeURIComponent(driveId)}/root:/${encodePathSegments(folderPath)}:/permissions`,
      { roles: ['read'], grantedToV2: { application: { id: clientId } } },
    ),
  };
}

function grantCommand(uri: string, body: object): string {
  return [
    'Connect-MgGraph -Scopes "Sites.FullControl.All"',
    `Invoke-MgGraphRequest -Method POST -Uri ${quoted(uri)} -Body ${quoted(JSON.stringify(body))}`,
  ].join('\n');
}

/** A PowerShell literal string, which expands nothing. */
function quoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
