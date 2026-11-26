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
  const documentUpload = capabilities.fileUpload
    ? getDocumentUpload(adapters, isStreaming || Boolean(isSubmitting))
    : undefined;
  const imagesEnabled = capabilities.fileUpload && adapters?.imageAttachments;
  const selectFiles = useComposerAttachmentSelection({
    onImages: imagesEnabled ? attachImages : undefined,
    onFiles:
      documentUpload &&
      ((files) => {
        void upload.run((signal) => documentUpload(threadId, files, signal));
      }),
    onError: adapters?.onAttachmentError ?? adapters?.onError,
  });
  return useDragOver({
    containerRef: container,
    disabled: !compact,
    onDrop: (files) => selectFiles(Array.from(files)),
  });
}

function getDocumentUpload(
  adapters: ChatConversationAdapters | undefined,
  busy: boolean,
) {
  return busy || adapters?.documentAttachments !== true
    ? undefined
    : adapters.uploadFiles;
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
        props.capabilities.fileUpload && props.adapters?.imageAttachments,
      ),
    onImagesPasted: attachImages,
  });
  return setFocused;
}
