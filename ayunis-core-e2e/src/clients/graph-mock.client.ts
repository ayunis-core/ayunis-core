// The Microsoft Graph stand-in (src/servers/graph-mock.mjs) the e2e backend
// syncs SharePoint from (MICROSOFT_GRAPH_URL).
const graphMockURL = process.env.E2E_GRAPH_URL ?? 'http://127.0.0.1:3195';

export const SHAREPOINT_HOST = 'e2e.sharepoint.com';

/**
 * Every site exists on first use, with the library `Dokumente` holding
 * `Satzungen/Hundesteuer.txt`, `Satzungen/Archiv/Gebühren.txt` and the
 * unsupported `Ortsplan.jpg`. Sites named `not-granted-…` are not granted
 * to the app.
 */
export function sharePointLibraryUrl(site: string): string {
  return `https://${SHAREPOINT_HOST}/sites/${site}/Freigegebene%20Dokumente`;
}

export function sharePointSiteUrl(site: string): string {
  return `https://${SHAREPOINT_HOST}/sites/${site}`;
}

export async function addSharePointFile(
  site: string,
  path: string,
  content: string,
): Promise<void> {
  const response = await fetch(`${graphMockURL}/e2e/sites/${site}/files`, {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });
  if (!response.ok)
    throw new Error(`Graph stand-in answered ${response.status}`);
}
