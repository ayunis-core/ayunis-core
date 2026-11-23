import { memo } from 'react';
import { MessageImage, UserMessage } from '@ayunis/chat/messages';
import type { Message } from '@/pages/chat/model/openapi';
import { useApiImageSrc } from '@/shared/hooks/useApiImageSrc';
import { Markdown, usePiiMasks } from '@/widgets/markdown';
import { resolvedPromptText } from '@/pages/chat/lib/sent-prompts';
import RoutineNudgeNotice from './RoutineNudgeNotice';
import CopyMessageButton from './CopyMessageButton';

function AuthenticatedMessageImage({
  imagePath,
  altText,
}: {
  readonly imagePath: string;
  readonly altText?: string;
}) {
  return (
    <MessageImage imageUrl={useApiImageSrc(imagePath)} altText={altText} />
  );
}

function ChatMessage({ message }: { readonly message: Message }) {
  const masks = usePiiMasks();

  return (
    <UserMessage
      message={message}
      renderImage={(image) => (
        <AuthenticatedMessageImage
          imagePath={`/threads/${message.threadId}/messages/${message.id}/images/${image.index}`}
          altText={image.altText}
        />
      )}
      renderText={(text) => <Markdown className="[&_p]:!my-0">{text}</Markdown>}
      renderNudge={(text) => <RoutineNudgeNotice text={text} />}
      actions={
        <CopyMessageButton
          getContent={() => ({ text: resolvedPromptText(message, masks) })}
        />
      }
    />
  );
}

export default memo(ChatMessage);
