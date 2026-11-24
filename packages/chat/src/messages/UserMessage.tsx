import { Fragment, memo, type ReactNode } from 'react';
import type {
  GetThreadResponseDto,
  ImageMessageContentResponseDto,
  TextMessageContentResponseDto,
} from '@ayunis/api-client/schemas';

type Message = GetThreadResponseDto['messages'][number];

export interface UserMessageProps {
  readonly message: Message;
  readonly renderImage: (image: ImageMessageContentResponseDto) => ReactNode;
  readonly renderText: (text: string) => ReactNode;
  readonly renderNudge: (text: string) => ReactNode;
  readonly actions?: ReactNode;
}

function UserMessage({
  message,
  renderImage,
  renderText,
  renderNudge,
  actions,
}: UserMessageProps) {
  if (message.role !== 'user' && message.role !== 'system') return null;

  const images = message.content.filter(
    (content) => content.type === 'image',
  ) as ImageMessageContentResponseDto[];
  const texts = (
    message.content.filter(
      (content) => content.type !== 'image',
    ) as TextMessageContentResponseDto[]
  ).filter((content) => !content.isSkillInstruction);

  if (
    images.length === 0 &&
    texts.length > 0 &&
    texts.every((content) => content.isNudge)
  ) {
    return (
      <>{renderNudge(texts.map((content) => content.text).join('\n\n'))}</>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div
        className="max-w-2xl min-w-0 space-y-2 overflow-hidden rounded-2xl bg-muted py-2.5 px-4"
        data-testid="user-message"
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image) => (
              <Fragment key={`image-${image.index}`}>
                {renderImage(image)}
              </Fragment>
            ))}
          </div>
        )}
        {texts.map(({ text }, index) => (
          <Fragment key={`text-${index}-${text.slice(0, 50)}`}>
            {renderText(text)}
          </Fragment>
        ))}
      </div>
      {texts.length > 0 && actions}
    </div>
  );
}

export default memo(UserMessage);
