// Types
import type { RefObject } from 'react';

// Utils
import { useEffect } from 'react';

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

      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        // Ensure clipboard images have filenames
        const namedFiles = imageFiles.map((file, index) => {
          if (file.name) return file;

          const fileName = `pasted-image-${Date.now()}-${index}.png`;
          return new File([file], fileName, { type: file.type });
        });
        onImagesPasted(namedFiles);
      }
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
