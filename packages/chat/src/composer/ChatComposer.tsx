import type { ComponentProps, ReactNode } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Card, CardContent } from '@ayunis/ui/components/card';
import { cn } from '@ayunis/ui/lib/cn';
import { ChatInputExpandable } from './ChatInputExpandable';
import { PendingImageThumbnail } from './PendingImageThumbnail';

export type ChatInputSubmissionState = 'idle' | 'submitting' | 'streaming';

interface ChatComposerProps {
  readonly state: ChatInputSubmissionState;
  readonly dragging: boolean;
  readonly animateHeight: boolean;
  readonly textarea: ComponentProps<typeof TextareaAutosize>;
  readonly attachments?: ReactNode;
  readonly images: ReadonlyArray<{
    id: string;
    preview: string;
    file: Pick<File, 'name'>;
  }>;
  readonly onRemoveImage: (imageId: string) => void;
  readonly actions: ReactNode;
}

export function ChatComposer(props: ChatComposerProps) {
  const { state, dragging, attachments, images, onRemoveImage, actions } =
    props;

  return (
    <Card
      className={cn(
        'chat-input-shell__card py-3 sm:py-4',
        dragging && 'border-2 border-dashed border-primary bg-primary/5',
        state !== 'idle' && !dragging && 'bg-card',
      )}
    >
      <CardContent className="px-(--chat-input-content-padding)">
        <div className="chat-input-body flex flex-col gap-4">
          {attachments && (
            <ChatInputExpandable show>{attachments}</ChatInputExpandable>
          )}
          {images.length > 0 && (
            <ChatInputExpandable show>
              <div className="flex flex-wrap gap-2 items-center pt-0">
                {images.map((image) => (
                  <PendingImageThumbnail
                    key={image.id}
                    image={image}
                    onRemove={onRemoveImage}
                  />
                ))}
              </div>
            </ChatInputExpandable>
          )}
          <ComposerTextarea {...props} />
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}

function ComposerTextarea({
  textarea,
  state,
  animateHeight,
}: Pick<ChatComposerProps, 'textarea' | 'state' | 'animateHeight'>) {
  return (
    <TextareaAutosize
      {...textarea}
      minRows={1}
      maxRows={10}
      autoFocus
      readOnly={state === 'submitting'}
      className={cn(
        'chat-input-shell__textarea border-0 border-none bg-transparent rounded-none resize-none focus:outline-none p-0',
        animateHeight && 'chat-input-shell__textarea--animate',
        state !== 'idle' && 'opacity-90',
        state === 'submitting' && 'cursor-not-allowed',
        state === 'streaming' && 'cursor-text',
      )}
      data-testid="input"
    />
  );
}

export { canSubmitMessage } from './can-submit-message';
export { useChatDraft, type ChatDraftStorage } from './use-chat-draft';
export { usePendingImages } from './use-pending-images';
export { useVoiceRecording } from './use-voice-recording';
export {
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MIB,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
  MAX_TOTAL_IMAGE_SIZE_MIB,
} from './image-upload-policy';
