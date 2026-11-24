import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  ChatComposer,
  canSubmitMessage,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_MIB,
  MAX_TOTAL_IMAGE_SIZE_MIB,
  type useChatDraft,
  usePendingImages,
} from '@ayunis/chat/composer';
import type { ChatCapabilities } from './chat-surface-config';
import type {
  ChatConversationAdapters,
  ChatConversationSlots,
} from './chat-conversation-config';
import type { SendMessageInput } from './use-chat-run-lifecycle';
import { AttachmentFields, ModelField, VoiceField } from './composer-features';
import { useChatAction } from './use-chat-action';

interface ComposerProps {
  readonly threadId: string;
  readonly capabilities: ChatCapabilities;
  readonly adapters?: ChatConversationAdapters;
  readonly draft: ReturnType<typeof useChatDraft>;
  readonly slots?: ChatConversationSlots;
  readonly isStreaming: boolean;
  readonly isCheckingForRun: boolean;
  readonly onSend: (input: SendMessageInput, accepted: () => void) => void;
  readonly onStop?: () => void;
}

function useSubmission(props: ComposerProps) {
  const {
    draft: { message, setMessage },
    capabilities,
    isStreaming,
    isCheckingForRun,
    onSend,
    adapters,
  } = props;
  const images = usePendingImages();
  const attachImages = useImageSelection(images, adapters?.onError);
  const upload = useChatAction(adapters?.onError, capabilities.fileUpload);
  const model = useChatAction(adapters?.onError, capabilities.modelSelection);
  const canSend = canSubmitMessage({
    text: message,
    hasAttachments: capabilities.fileUpload && images.pendingImages.length > 0,
    busy:
      isStreaming ||
      isCheckingForRun ||
      upload.busy ||
      model.busy ||
      Boolean(adapters?.isSendDisabled),
  });

  function submit() {
    if (!canSend) return;
    onSend(
      {
        text: message,
        images: capabilities.fileUpload
          ? images.getImagesForContext()
          : undefined,
      },
      () => {
        setMessage((current) => (current === message ? '' : current));
        images.clearImages();
      },
    );
  }

  return { images, canSend, submit, upload, model, attachImages };
}

export function ConfiguredComposer(props: ComposerProps) {
  const {
    draft: { message, setMessage },
    isStreaming,
    capabilities,
    slots,
  } = props;
  const { t } = useTranslation('common');
  const submission = useSubmission(props);
  return (
    <ChatComposer
      state={isStreaming ? 'streaming' : 'idle'}
      dragging={false}
      animateHeight={false}
      attachments={capabilities.fileUpload && slots?.attachments}
      images={capabilities.fileUpload ? submission.images.pendingImages : []}
      onRemoveImage={submission.images.removeImage}
      textarea={{
        value: message,
        'aria-label': t('chatSurface.message', { defaultValue: 'Message' }),
        onChange: (event) => setMessage(event.target.value),
        onKeyDown: (event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            submission.submit();
          }
        },
      }}
      actions={<ComposerActions {...props} {...submission} />}
    />
  );
}

function useImageSelection(
  images: ReturnType<typeof usePendingImages>,
  onError?: (error: Error) => void,
) {
  const { t } = useTranslation('common');

  return (files: File[]) => {
    if (!files.length) return;
    const { oversizedRejected, limitExceeded, totalExceeded } =
      images.addImages(files);
    if (!onError) return;
    if (oversizedRejected) {
      onError(
        new Error(t('chatInput.imageTooLarge', { maxMiB: MAX_IMAGE_SIZE_MIB })),
      );
    }
    if (limitExceeded) {
      onError(
        new Error(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES })),
      );
    }
    if (totalExceeded) {
      onError(
        new Error(
          t('chatInput.imageTotalTooLarge', {
            maxMiB: MAX_TOTAL_IMAGE_SIZE_MIB,
          }),
        ),
      );
    }
  };
}

function ComposerActions(
  props: ComposerProps & ReturnType<typeof useSubmission>,
) {
  const {
    capabilities,
    slots,
    adapters,
    threadId,
    isStreaming,
    attachImages,
    upload,
    model,
  } = props;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {capabilities.fileUpload && (
        <AttachmentFields
          threadId={threadId}
          disabled={isStreaming}
          upload={adapters?.uploadFiles}
          action={upload}
          audio={capabilities.audio}
          images={adapters?.imageAttachments}
          onImages={attachImages}
        />
      )}
      {capabilities.modelSelection && adapters?.model && (
        <ModelField
          threadId={threadId}
          disabled={isStreaming}
          adapter={adapters.model}
          action={model}
        />
      )}
      {capabilities.voice && adapters?.transcribe && (
        <VoiceField
          transcribe={adapters.transcribe}
          onError={adapters.onError}
          onTranscript={(text) =>
            props.draft.setMessage((draft) =>
              draft ? draft + ' ' + text : text,
            )
          }
        />
      )}
      <HostComposerActions capabilities={capabilities} slots={slots} />
      <SendOrStop {...props} />
    </div>
  );
}

function HostComposerActions({
  capabilities,
  slots,
}: Readonly<Pick<ComposerProps, 'capabilities' | 'slots'>>) {
  return (
    <>
      {capabilities.skills && slots?.skills}
      {capabilities.knowledgeBases && slots?.knowledgeBases}
      {capabilities.integrations && slots?.integrations}
    </>
  );
}

function SendOrStop({
  isStreaming,
  canSend,
  submit,
  onStop,
}: Readonly<{
  isStreaming: boolean;
  canSend: boolean;
  submit: () => void;
  onStop?: () => void;
}>) {
  const { t } = useTranslation('common');
  return (
    <div className="ml-auto">
      {isStreaming ? (
        <Button type="button" disabled={!onStop} onClick={onStop}>
          {t('chatSurface.stop', { defaultValue: 'Stop' })}
        </Button>
      ) : (
        <Button type="button" disabled={!canSend} onClick={submit}>
          {t('chatSurface.send', { defaultValue: 'Send' })}
        </Button>
      )}
    </div>
  );
}
