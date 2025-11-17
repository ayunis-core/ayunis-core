import { usePromptsControllerDelete } from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return usePromptsControllerDelete({
    mutation: {
      onSuccess: () => {
        // Invalidate and refetch prompts list
        void queryClient.invalidateQueries({
          queryKey: ['prompts'],
        });
      },
    },
  });
}
