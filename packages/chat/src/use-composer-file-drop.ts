import { useState, type RefObject } from 'react';
import { useDragOver } from '@ayunis/ui/hooks/use-drag-over';
import type { ComposerFeatures } from './configured-composer-types';
import { useImagePaste } from './composer/use-image-paste';
import { useComposerAttachmentSelection } from './composer/use-composer-attachment-selection';
import { showComposerError } from './composer-errors';

type TransferProps = Readonly<{
  isStreaming: boolean;
  isSubmitting?: boolean;
  features: ComposerFeatures;
}>;

export function useComposerFileDrop(
  container: RefObject<HTMLElement | null>,
  { features, isStreaming, isSubmitting }: TransferProps,
  attachImages: (files: File[]) => void,
) {
  const documentsBusy = Boolean(isSubmitting) || isStreaming;
  const canAttachImages = features.imageAttachments && !isSubmitting;
  const selectFiles = useComposerAttachmentSelection({
    onImages: canAttachImages ? attachImages : undefined,
    onFiles: documentsBusy ? undefined : features.uploadFiles,
    onError: (error) => showComposerError(error.message),
  });
  return useDragOver({
    containerRef: container,
    onDrop: (files) => selectFiles(Array.from(files)),
  });
}

export function useComposerImagePaste(
  container: RefObject<HTMLElement | null>,
  { features, isSubmitting }: TransferProps,
  attachImages: (files: File[]) => void,
) {
  const [focused, setFocused] = useState(false);
  useImagePaste({
    containerRef: container,
    isFocused: focused && features.imageAttachments && !isSubmitting,
    onImagesPasted: attachImages,
  });
  return setFocused;
}
