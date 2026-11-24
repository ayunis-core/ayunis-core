import { useLayoutEffect, useRef, useState } from 'react';
import {
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_IMAGE_SIZE_BYTES,
} from './image-upload-policy';

let nextPreviewId = 0;

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

export interface AddImagesResult {
  added: number;
  limitExceeded: boolean;
  oversizedRejected: boolean;
  totalExceeded: boolean;
}

function selectWithinTotal(files: File[], attachedBytes: number): File[] {
  let total = attachedBytes;
  return files.filter((file) => {
    if (total + file.size > MAX_TOTAL_IMAGE_SIZE_BYTES) return false;
    total += file.size;
    return true;
  });
}

function prepareImages(files: File[], pending: readonly PendingImage[]) {
  const fitsSize = files.filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES);
  const oversizedRejected = fitsSize.length < files.length;
  const remaining = MAX_IMAGES - pending.length;
  if (remaining <= 0) {
    return {
      previews: [],
      limitExceeded: true,
      oversizedRejected,
      totalExceeded: false,
    };
  }

  const fitsTotal = selectWithinTotal(
    fitsSize,
    pending.reduce((bytes, { file }) => bytes + file.size, 0),
  );
  const previews = fitsTotal.slice(0, remaining).map((file) => ({
    id: String(++nextPreviewId),
    file,
    preview: URL.createObjectURL(file),
  }));
  return {
    previews,
    limitExceeded: fitsTotal.length > remaining,
    oversizedRejected,
    totalExceeded: fitsTotal.length < fitsSize.length,
  };
}

export function usePendingImages() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const current = useRef<PendingImage[]>([]);
  useLayoutEffect(
    () => () => {
      current.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
      current.current = [];
    },
    [],
  );

  function update(images: PendingImage[]) {
    current.current = images;
    setPendingImages(images);
  }

  function addImages(files: File[]): AddImagesResult {
    const { previews, ...result } = prepareImages(files, current.current);
    update([...current.current, ...previews]);
    return { ...result, added: previews.length };
  }

  function removeImage(imageId: string) {
    const image = current.current.find(({ id }) => id === imageId);
    if (!image) return;
    URL.revokeObjectURL(image.preview);
    update(current.current.filter(({ id }) => id !== imageId));
  }

  function clearImages() {
    current.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
    update([]);
  }

  function getImagesForContext() {
    return current.current.map(({ file }) => ({
      file,
      altText: file.name || 'Pasted image',
    }));
  }

  return {
    pendingImages,
    addImages,
    removeImage,
    clearImages,
    getImagesForContext,
  };
}
