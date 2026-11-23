/**
 * The form under which a system is unique in the catalog: http(s) only,
 * without credentials, fragment and trailing slashes; host lowercased and
 * default port dropped (by `URL`). `null` for anything else.
 */
export function normalizeOparlSystemUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  let path = url.pathname;
  while (path.endsWith('/')) path = path.slice(0, -1);
  return `${url.protocol}//${url.host}${path}${url.search}`;
}
