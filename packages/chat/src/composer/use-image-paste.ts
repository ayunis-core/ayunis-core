import { useEffect, type RefObject } from 'react';

function readClipboardImages(data: DataTransfer | null): File[] {
  // Rich-text copies can include a clipboard preview. Only image-only
  // pastes should create an attachment.
  if (!data || data.getData('text/plain')) return [];

  return Array.from(data.items)
    .filter((item) => item.type.startsWith('image/'))
    .flatMap((item, index) => {
      const file = item.getAsFile();
      if (!file) return [];
      return [
        file.name
          ? file
          : new File([file], `pasted-image-${Date.now()}-${index}.png`, {
              type: file.type,
            }),
      ];
    });
}

interface UseImagePasteOptions {
  containerRef: RefObject<HTMLElement | null>;
  isFocused: boolean;
  onImagesPasted: (files: File[]) => void;
}

export function useImagePaste({
  containerRef,
  isFocused,
  onImagesPasted,
}: UseImagePasteOptions): void {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isFocused) return;

      const imageFiles = readClipboardImages(e.clipboardData);
      if (!imageFiles.length) return;
      e.preventDefault();
      onImagesPasted(imageFiles);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('paste', handlePaste);

      return () => {
        container.removeEventListener('paste', handlePaste);
      };
    }
  }, [containerRef, isFocused, onImagesPasted]);
}
