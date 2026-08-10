/**
 * Single source of truth for how an org's blobs are laid out in object storage.
 *
 * Each entry is the static path segment that namespaces an org-scoped layout, or
 * `null` for the top-level `<orgId>/...` layout. In every layout the org id is
 * the path segment immediately after the root.
 *
 * Both directions derive from this list, so a new org-scoped layout added here
 * is picked up by the purge and the orphan sweep at once:
 *   - `orgStoragePrefixes` builds the prefixes to purge for a given org.
 *   - `extractOrgIdFromKey` recovers the org id from an existing key so the
 *     orphan sweeper can discover blobs whose org no longer exists.
 */
const ORG_STORAGE_ROOTS: readonly (string | null)[] = [
  null,
  'generated-images',
  'letterheads',
];

const NESTED_ROOTS: ReadonlySet<string> = new Set(
  ORG_STORAGE_ROOTS.filter((root): root is string => root !== null),
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The storage key prefixes under which every blob owned by `orgId` lives. */
export function orgStoragePrefixes(orgId: string): string[] {
  return ORG_STORAGE_ROOTS.map((root) =>
    root === null ? `${orgId}/` : `${root}/${orgId}/`,
  );
}

/**
 * The org id embedded in a storage key, or `null` when the key does not match
 * any known org-scoped layout (so the sweeper never purges keys it can't map).
 */
export function extractOrgIdFromKey(objectName: string): string | null {
  const [first, second] = objectName.split('/');
  if (NESTED_ROOTS.has(first)) {
    return second && UUID_REGEX.test(second) ? second : null;
  }
  return UUID_REGEX.test(first) ? first : null;
}
