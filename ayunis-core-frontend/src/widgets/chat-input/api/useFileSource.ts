import { threadsControllerAddFileSource } from "@/shared/api";
import type { ThreadsControllerAddFileSourceBody } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

interface UseFileSourceProps {
  threadId?: string;
}

interface UploadFileParams {
  file: File;
  name?: string;
  description?: string;
}

export function useFileSource({ threadId }: UseFileSourceProps = {}) {
  const { t } = useTranslation("common");

  const createFileSourceMutation = useMutation({
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
    onSuccess: () => {},
    onError: (error: unknown) => {
      console.error("Failed to create file source:", error);
      showError(t("chatInput.fileSourceUploadError"));
    },
  });

  const uploadFile = ({ file, name, description }: UploadFileParams) => {
    if (!threadId) {
      console.error("Thread ID is required");
      showError("Thread ID is required");
      return;
    }

    const data: ThreadsControllerAddFileSourceBody = {
      file,
      name: name || file.name,
      description,
    };

    createFileSourceMutation.mutate({ id: threadId, data });
  };

  return {
    uploadFile,
    isLoading: createFileSourceMutation.isPending,
    error: createFileSourceMutation.error,
    reset: createFileSourceMutation.reset,
  };
}
