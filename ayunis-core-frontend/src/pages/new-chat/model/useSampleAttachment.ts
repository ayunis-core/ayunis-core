import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * Downloads the file at `url` and hands it to `onFile` so it can be attached
 * to the chat. Used when the chat is opened with a prefilled sample attachment.
 *
 * Handling the awkward parts so the page doesn't have to:
 * - The fetch is cancelled (AbortController) when the component unmounts or
 *   the URL changes, so a late response never calls `onFile` after teardown.
 * - The same URL is only loaded once. The flag is set *after* a successful
 *   load, so an aborted in-flight fetch (e.g. React Strict Mode's double
 *   effect run) can still retry instead of being permanently skipped.
 * - Failures are ignored: the sample attachment is optional.
 *
 * `onFile` is wrapped in an Effect Event so the download only re-runs when the
 * URL changes, even though the caller passes a fresh callback each render.
 */
export function useSampleAttachment(
  url: string | undefined,
  onFile: (file: File) => void,
): void {
  const onFileLoaded = useEffectEvent(onFile);
  const loadedUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!url || loadedUrl.current === url) return;
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
      } catch {
        // Sample attachment is optional — ignore fetch failures silently.
      }
    })();
    return () => controller.abort();
  }, [url]);
}
