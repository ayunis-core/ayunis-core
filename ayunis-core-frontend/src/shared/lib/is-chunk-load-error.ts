/**
 * Detects chunk/module load failures caused by stale deployments.
 *
 * After a new deployment, users with cached HTML may try to import
 * JS chunks that no longer exist (different content hashes). This
 * manifests as dynamic import errors or "loading chunk failed" errors.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    // Vite / native dynamic import
    message.includes('failed to fetch dynamically imported module') ||
    // Webpack-style (in case of migration)
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    // Generic network failures during chunk fetch
    (error.name === 'TypeError' && message.includes('failed to fetch'))
  );
}
