import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * Downloads the file at `url` and hands the resulting `File` to `onFile`.
 *
 * Handling the awkward parts so callers don't have to:
 * - The fetch is cancelled (AbortController) when the component unmounts or
 *   the URL changes, so a late response never calls `onFile` after teardown.
 * - The same URL is only loaded once. The flag is set *after* a successful
 *   load, so an aborted in-flight fetch (e.g. React Strict Mode's double
 *   effect run) can still retry instead of being permanently skipped.
 * - Failures are best-effort: a non-ok response yields no `onFile` call; a
 *   thrown error is logged unless it's an abort (unmount / URL change).
 *
 * `onFile` is wrapped in an Effect Event so the download only re-runs when the
 * URL changes, even though the caller passes a fresh callback each render.
 */
export function useFileFromUrl(
  url: string | undefined,
  onFile: (file: File) => void,
): void {
  const onFileLoaded = useEffectEvent(onFile);
  const loadedUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!url || loadedUrl.current === url) {
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const blob = await res.blob();
        const name = url.split('/').pop() ?? 'file';
        const file = new File([blob], name, {
          type: blob.type || 'application/octet-stream',
        });
        loadedUrl.current = url;
        onFileLoaded(file);
      } catch (error) {
        // An abort (unmount / URL change) is expected — stay silent. Anything
        // else is a real, best-effort-download failure worth surfacing.
        if (!controller.signal.aborted) {
          console.warn('useFileFromUrl: failed to download', url, error);
        }
      }
    })();
    return () => controller.abort();
  }, [url]);
}
