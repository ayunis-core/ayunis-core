import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { composerFileType, FILE_SIZE_MIB } from './document-upload-policy';

type SelectionHandlers = Readonly<{
  onImages?: (files: File[]) => void;
  onFiles?: (files: File[]) => void;
  onError?: (error: Error) => void;
}>;

export function useComposerAttachmentSelection({
  onImages,
  onFiles,
  onError,
}: SelectionHandlers) {
  const { t } = useTranslation('common');
  return (files: readonly File[]) => {
    const selection = classifyAttachments(
      files,
      Boolean(onImages),
      Boolean(onFiles),
    );
    if (selection.images.length) onImages?.(selection.images);
    if (selection.documents.length) onFiles?.(selection.documents);
    if (selection.skipped)
      onError?.(new Error(t('chatInput.invalidDroppedFileType')));
    reportOversized(selection.oversized, t, onError);
  };
}

function reportOversized(
  oversized: readonly { file: File; limit: number }[],
  t: TFunction,
  onError?: (error: Error) => void,
) {
  for (const { file, limit } of oversized) {
    onError?.(
      new Error(
        t('chatInput.fileTooLarge', {
          name: file.name,
          size: Math.ceil(file.size / FILE_SIZE_MIB),
          limit: limit / FILE_SIZE_MIB,
        }),
      ),
    );
  }
}

function classifyAttachments(
  files: readonly File[],
  imagesEnabled: boolean,
  documentsEnabled: boolean,
) {
  const images: File[] = [];
  const documents: File[] = [];
  const oversized: { file: File; limit: number }[] = [];
  let skipped = false;
  for (const file of files) {
    const type = composerFileType(file);
    if (type.kind === 'image' && imagesEnabled) images.push(file);
    else if (type.kind === 'document' && documentsEnabled) {
      if (type.limit) oversized.push({ file, limit: type.limit });
      else documents.push(file);
    } else skipped = true;
  }
  return { images, documents, oversized, skipped };
}
