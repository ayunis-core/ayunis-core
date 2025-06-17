import { usePromptsControllerFindAll } from "@/shared/api/generated/ayunisCoreAPI";

export interface ChatPrompt {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function usePrompts() {
  const {
    data: prompts = [],
    isLoading,
    error,
    refetch,
  } = usePromptsControllerFindAll({
    query: {
      queryKey: ["prompts"],
    },
  });

  return {
    prompts: prompts as ChatPrompt[],
    isLoading,
    error,
    refetch,
  };
}
