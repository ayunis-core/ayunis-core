import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  agentsControllerUpdate,
  getAgentsControllerFindAllQueryKey,
  getAgentsControllerFindOneQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { AgentResponseDto } from "@/shared/api";

const updateAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  modelId: z.string().min(1, "Model is required"),
});

type UpdateAgentData = z.infer<typeof updateAgentSchema>;

interface UseUpdateAgentProps {
  agent: AgentResponseDto;
}

export function useUpdateAgent({ agent }: UseUpdateAgentProps) {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  const form = useForm<UpdateAgentData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      instructions: agent.instructions,
      modelId: agent.model.id,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateAgentData) => {
      return await agentsControllerUpdate(agent.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindAllQueryKey()],
      });
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindOneQueryKey(agent.id)],
      });
      toast.success(t("update.success"));
    },
    onError: () => {
      toast.error(t("update.error"));
    },
  });

  const onSubmit = (data: UpdateAgentData) => {
    mutation.mutate(data);
  };

  return {
    form,
    onSubmit,
    isLoading: mutation.isPending,
  };
}
