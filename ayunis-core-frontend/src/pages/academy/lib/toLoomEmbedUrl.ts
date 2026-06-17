/**
 * Converts a Loom share URL into an embeddable URL for use as an iframe `src`.
 *
 * Loom lesson URLs are stored as either share or embed links (validated against
 * `^https://(www\.)?loom\.com/(share|embed)/[A-Za-z0-9]+`). The `share` form does not
 * render inside an iframe, so we rewrite `/share/` to `/embed/` and drop any query string.
 * Already-embed URLs are returned unchanged (minus the query string).
 */
export function toLoomEmbedUrl(loomUrl: string): string {
  const withoutQuery = loomUrl.split('?')[0];
  return withoutQuery.replace('/share/', '/embed/');
}
