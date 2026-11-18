import { useEffect, useState } from 'react';
import config from '@/shared/config';
import { getEmbeddedSession } from '@/shared/api/embedded-session';

/**
 * `src` for an image served by the API. The web app's `<img>` carries the
 * session cookie; the pane has a Bearer token instead, which an `<img>` can't
 * send, so there the image is fetched and shown from a blob URL.
 */
export function useApiImageSrc(path: string): string | undefined {
  const session = getEmbeddedSession();
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    let url: string | undefined;
    session
      .request(path, { signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : undefined))
      .then((blob) => {
        // An image left before it loaded would keep a URL nobody revokes.
        if (!blob || controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [session, path]);

  return session ? blobUrl : `${config.api.baseUrl}${path}`;
}
