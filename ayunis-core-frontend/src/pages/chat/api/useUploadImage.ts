import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { storageControllerUploadFile } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  StorageControllerUploadFileBody,
  StorageControllerUploadFileParams,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export function useUploadImage(threadId?: string) {
  const { t } = useTranslation('chats');
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error(t('chat.errorInvalidImageType') || 'Invalid image type');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        t('chat.errorImageTooLarge', { maxSize: MAX_IMAGE_SIZE_MB }) ||
          `Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE_MB} MB`,
      );
    }

    if (!threadId) {
      throw new Error(
        t('chat.errorThreadIdRequired') ||
          'Thread ID is required for image upload',
      );
    }

    setIsUploading(true);
    try {
      const body: StorageControllerUploadFileBody = {
        file,
      };

      const params: StorageControllerUploadFileParams = {
        scopeType: 'thread',
        scopeId: threadId,
      };

      const response = await storageControllerUploadFile(body, params);

      // Backend returns { objectName, size, etag, contentType, lastModified }
      if (
        response &&
        typeof response === 'object' &&
        'objectName' in response
      ) {
        return response.objectName;
      }

      throw new Error(
        t('chat.errorImageUploadResponse') || 'Unexpected upload response',
      );
    } catch (error) {
      // Typing for error is lost.
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (error instanceof Error ? error.message : undefined) ||
        t('chat.errorUploadImage') ||
        'Failed to upload image';
      
      showError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading,
  };
}
