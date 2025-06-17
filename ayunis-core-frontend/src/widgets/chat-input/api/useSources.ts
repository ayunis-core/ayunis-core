import { useSourcesControllerCreateFileSource } from "@/shared/api";
import type { SourcesControllerCreateFileSourceBody } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface UseSourcesProps {
  threadId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useSources({
  threadId,
  onSuccess,
  onError,
}: UseSourcesProps = {}) {
  const createFileSourceMutation = useSourcesControllerCreateFileSource({
    mutation: {
      onSuccess: () => {
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to create file source:", error);
        onError?.(error);
      },
    },
  });

  const uploadFile = (file: File, fileName?: string, fileType?: string) => {
    const data: SourcesControllerCreateFileSourceBody = {
      file,
      threadId,
      fileName: fileName || file.name,
      fileType: fileType || file.type,
    };

    createFileSourceMutation.mutate({ data });
  };

  return {
    uploadFile,
    isCreatingFileSource: createFileSourceMutation.isPending,
    fileSourceError: createFileSourceMutation.error,
  };
}
