import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/shadcn/dialog';
import type { Message, ImageMessageContentResponseDto } from '../model/openapi';
import config from '@/shared/config';
import { Markdown } from '@/widgets/markdown';
import type { TextMessageContentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface ChatMessageProps {
  readonly message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role !== 'user' && message.role !== 'system') return null;

  const images = message.content.filter(
    (c) => c.type === 'image',
  ) as ImageMessageContentResponseDto[];
  const texts = (
    message.content.filter(
      (c) => c.type !== 'image',
    ) as TextMessageContentResponseDto[]
  ).filter((c) => !c.isSkillInstruction);

  return (
    <div className="flex justify-end">
      <div
        className="max-w-2xl min-w-0 space-y-2 overflow-hidden rounded-2xl bg-muted py-2.5 px-4"
        data-testid="user-message"
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((imageContent) => (
              <ImageThumbnail
                key={`image-${imageContent.index}`}
                imageContent={imageContent}
                imageUrl={`${config.api.baseUrl}/threads/${message.threadId}/messages/${message.id}/images/${imageContent.index}`}
              />
            ))}
          </div>
        )}
        {texts.map((textContent, index) => (
          <Markdown
            key={`text-${index}-${textContent.text.slice(0, 50)}`}
            className="[&_p]:!my-0"
          >
            {textContent.text}
          </Markdown>
        ))}
      </div>
    </div>
  );
}

function ImageThumbnail({
  imageContent,
  imageUrl,
}: {
  readonly imageContent: ImageMessageContentResponseDto;
  readonly imageUrl: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-lg h-14.5 w-14.5 my-2 overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={imageUrl}
          alt={imageContent.altText}
          className="w-full h-full object-cover"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {imageContent.altText ?? 'Image preview'}
          </DialogTitle>
          <img
            src={imageUrl}
            alt={imageContent.altText}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
