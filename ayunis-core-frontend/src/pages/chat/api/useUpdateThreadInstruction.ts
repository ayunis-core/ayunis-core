import { useThreadsControllerUpdateInstruction } from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadInstructionDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

export function useUpdateThreadInstruction() {
  const mutation = useThreadsControllerUpdateInstruction();

  const updateInstruction = async (
    threadId: string,
    instruction: string,
  ): Promise<void> => {
    const data: UpdateThreadInstructionDto = { instruction };
    await mutation.mutateAsync({ id: threadId, data });
  };

  return {
    updateInstruction,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
