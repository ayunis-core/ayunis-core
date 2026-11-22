/** A SharePoint Online URL, split into its site and the path below it. */
export interface SharePointUrl {
  host: string;
  /** Server-relative path of the site, e.g. `sites/bauamt`; `''` for the root site. */
  sitePath: string;
  /** The decoded path below the site: a library, then its folders. */
  path: string[];
}

const SITE_COLLECTIONS = new Set(['sites', 'teams']);
/** Segments from which on a URL shows a page of the site, such as its home page. */
const SITE_PAGES = new Set(['sitepages', '_layouts']);
/** `/:f:/r/sites/…` is a link to the path that follows; `/:f:/s/…` a sharing link. */
const LINK_TYPE = /^:[a-z]:$/i;

/**
 * The site and path of a URL copied from SharePoint Online: a site, a
 * library or a folder, also from a library view
 * (`…/Forms/AllItems.aspx?id=…`). `null` for anything else, such as a
 * sharing link, which only resolves through `/shares` and so cannot tell
 * "not granted" from "doesn't exist".
 */
export function parseSharePointUrl(raw: string): SharePointUrl | null {
  const url = parseUrl(raw.trim());
  if (url?.protocol !== 'https:' || !url.hostname.endsWith('.sharepoint.com'))
    return null;
  const segments = serverRelativePath(url);
  if (!segments) return null;
  const [first, name, ...rest] = segments;
  if (first && name && SITE_COLLECTIONS.has(first.toLowerCase()))
    return {
      host: url.hostname,
      sitePath: `${first.toLowerCase()}/${name}`,
      path: rest,
    };
  return { host: url.hostname, sitePath: '', path: segments };
}

/** The site collection a site path is in: itself, or the one of a subsite. */
export function siteCollectionPath(sitePath: string): string {
  const [first, name] = sitePath.split('/');
  return first && name && SITE_COLLECTIONS.has(first.toLowerCase())
    ? `${first}/${name}`
    : '';
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function serverRelativePath(url: URL): string[] | null {
  const segments = linkedPath(decodedSegments(url.pathname));
  if (!segments) return null;
  const sitePage = segments.findIndex((segment) =>
    SITE_PAGES.has(segment.toLowerCase()),
  );
  if (sitePage !== -1) return segments.slice(0, sitePage);
  if (!segments.at(-1)?.toLowerCase().endsWith('.aspx')) return segments;
  // A library view, e.g. `Freigegebene Dokumente/Forms/AllItems.aspx`,
  // names the folder it shows in `id`.
  const viewed =
    url.searchParams.get('id') ?? url.searchParams.get('RootFolder');
  if (viewed) return viewed.split('/').filter(Boolean);
  const library = segments.slice(0, -1);
  return library.at(-1)?.toLowerCase() === 'forms'
    ? library.slice(0, -1)
    : library;
}

/** The path a `/:f:/r/…` link leads to; `null` for a sharing link. */
function linkedPath(segments: string[] | null): string[] | null {
  if (!segments || !LINK_TYPE.test(segments[0] ?? '')) return segments;
  return segments[1] === 'r' ? segments.slice(2) : null;
}

function decodedSegments(pathname: string): string[] | null {
  try {
    return pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

/** Path segments as one URL path, e.g. for Graph's `root:/{path}`. */
export function encodePathSegments(segments: string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}
