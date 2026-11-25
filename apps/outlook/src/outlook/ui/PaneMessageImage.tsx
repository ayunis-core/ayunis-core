import { useEffect, useState } from 'react';
import { apiFetch } from '@ayunis/api-client/transport';
import { MessageImage } from '@ayunis/chat/messages';

export function PaneMessageImage({
  threadId,
  messageId,
  index,
  altText,
}: Readonly<{
  threadId: string;
  messageId: string;
  index: number;
  altText?: string;
}>) {
  const [imageUrl, setImageUrl] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let objectUrl: string | undefined;
    const path =
      '/threads/' +
      encodeURIComponent(threadId) +
      '/messages/' +
      encodeURIComponent(messageId) +
      '/images/' +
      index;
    void apiFetch(path, { signal })
      .then(async (response) => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [threadId, messageId, index]);
  return imageUrl ? (
    <MessageImage imageUrl={imageUrl} altText={altText} />
  ) : null;
}
