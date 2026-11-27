import { MessageImage } from './MessageImage';
import { useApiImageSrc } from './use-api-image-src';

/** An image the user sent, loaded with the surface's credentials. */
export function ConversationMessageImage({
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
  const src = useApiImageSrc(
    `/threads/${threadId}/messages/${messageId}/images/${index}`,
  );
  return <MessageImage imageUrl={src} altText={altText} />;
}
