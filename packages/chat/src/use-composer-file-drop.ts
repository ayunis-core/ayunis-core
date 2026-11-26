import { useState, type RefObject } from 'react';
import { useDragOver } from '@ayunis/ui/hooks/use-drag-over';
import type { ChatConversationAdapters } from './chat-conversation-config';
import type { ChatCapabilities } from './chat-surface-config';
import type { useChatAction } from './use-chat-action';
import { useImagePaste } from './composer/use-image-paste';
import { useComposerAttachmentSelection } from './composer/use-composer-attachment-selection';

type TransferProps = Readonly<{
  compact?: boolean;
  threadId: string;
  isStreaming: boolean;
  isSubmitting?: boolean;
  capabilities: ChatCapabilities;
  adapters?: ChatConversationAdapters;
}>;

export function useComposerFileDrop(
  container: RefObject<HTMLElement | null>,
  {
    threadId,
    compact,
    capabilities,
    adapters,
    isStreaming,
    isSubmitting,
  }: TransferProps,
  upload: ReturnType<typeof useChatAction>,
  attachImages: (files: File[]) => void,
) {
  const imageBusy = attachmentsBusy({ isSubmitting, isStreaming, adapters });
  const documentBusy = Boolean(isSubmitting) || isStreaming;
  const documentUpload = getDocumentUpload(
    capabilities,
    adapters,
    documentBusy,
  );
  const selectFiles = useComposerAttachmentSelection({
    onImages: canAttachImages(capabilities, adapters, imageBusy)
      ? attachImages
      : undefined,
    onFiles: createDocumentSelection(documentUpload, threadId, upload),
    onError: adapters?.onAttachmentError ?? adapters?.onError,
  });
  return useDragOver({
    containerRef: container,
    disabled: !compact,
    onDrop: (files) => selectFiles(Array.from(files)),
  });
}

function getDocumentUpload(
  capabilities: ChatCapabilities,
  adapters: ChatConversationAdapters | undefined,
  busy: boolean,
) {
  if (!capabilities.fileUpload || busy) return undefined;
  if (adapters?.documentAttachments !== true) return undefined;
  return adapters.uploadFiles;
}

function attachmentsBusy({
  isSubmitting,
  isStreaming,
  adapters,
}: Pick<TransferProps, 'isSubmitting' | 'isStreaming' | 'adapters'>) {
  return (
    Boolean(isSubmitting) ||
    (isStreaming && !adapters?.allowAttachmentsWhileStreaming)
  );
}

function canAttachImages(
  capabilities: ChatCapabilities,
  adapters: ChatConversationAdapters | undefined,
  busy: boolean,
) {
  return (
    capabilities.fileUpload && Boolean(adapters?.imageAttachments) && !busy
  );
}

function createDocumentSelection(
  uploadFiles: ChatConversationAdapters['uploadFiles'] | undefined,
  threadId: string,
  action: ReturnType<typeof useChatAction>,
) {
  if (!uploadFiles) return undefined;
  return (files: File[]) => {
    void action.run((signal) => uploadFiles(threadId, files, signal));
  };
}

export function useComposerImagePaste(
  container: RefObject<HTMLElement | null>,
  props: TransferProps,
  attachImages: (files: File[]) => void,
) {
  const [focused, setFocused] = useState(false);
  useImagePaste({
    containerRef: container,
    isFocused:
      focused &&
      Boolean(
        props.capabilities.fileUpload &&
        props.adapters?.imageAttachments &&
        !props.isSubmitting &&
        (!props.isStreaming || props.adapters?.allowAttachmentsWhileStreaming),
      ),
    onImagesPasted: attachImages,
  });
  return setFocused;
}
