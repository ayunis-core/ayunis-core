import { useThreadsControllerAddFileSource } from "@/shared/api";
import type { ThreadsControllerAddFileSourceBody } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface UseFileSourceProps {
  threadId?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface UploadFileParams {
  file: File;
  name?: string;
  description?: string;
}

export function useFileSource({
  threadId,
  onSuccess,
  onError,
}: UseFileSourceProps = {}) {
  const createFileSourceMutation = useThreadsControllerAddFileSource({
    mutation: {
      onSuccess: () => {
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error("Failed to create file source:", error);
        onError?.(error);
      },
    },
  });

  const uploadFile = ({ file, name, description }: UploadFileParams) => {
    if (!threadId) {
      console.error("Thread ID is required");
      onError?.(new Error("Thread ID is required"));
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
