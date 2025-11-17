import {
  getThreadsControllerFindOneQueryKey,
  threadsControllerAddFileSource,
} from '@/shared/api';
import type { ThreadsControllerAddFileSourceBody } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

interface UseFileSourceProps {
  threadId?: string;
}

interface UploadFileParams {
  file: File;
  name?: string;
  description?: string;
}

export function useCreateFileSource({ threadId }: UseFileSourceProps = {}) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const createFileSourceMutation = useMutation({
    retry: 0,
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ThreadsControllerAddFileSourceBody;
    }) => {
      // Create custom AbortController with 5 minute timeout
      // because the default timeout is 10 seconds and this will take longer
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      try {
        const result = await threadsControllerAddFileSource(
          id,
          data,
          controller.signal,
        );
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to create file source:', error);
      showError(t('chatInput.fileSourceUploadError'));
    },
    onSettled: () => {
      if (!threadId) return;
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
      void router.invalidate();
    },
  });

  function createFileSource({ file, name, description }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      showError('Thread ID is required');
      return;
    }

    const data: ThreadsControllerAddFileSourceBody = {
      file,
      name: name || file.name,
      description,
    };

    createFileSourceMutation.mutate({ id: threadId, data });
  }

  function createFileSourceAsync({
    file,
    name,
    description,
  }: UploadFileParams) {
    if (!threadId) {
      console.error('Thread ID is required');
      showError('Thread ID is required');
      return;
    }

    const data: ThreadsControllerAddFileSourceBody = {
      file,
      name: name || file.name,
      description,
    };

    return createFileSourceMutation.mutateAsync({ id: threadId, data });
  }

  return {
    createFileSource,
    createFileSourceAsync,
    isLoading: createFileSourceMutation.isPending,
    error: createFileSourceMutation.error,
    reset: createFileSourceMutation.reset,
  };
}
