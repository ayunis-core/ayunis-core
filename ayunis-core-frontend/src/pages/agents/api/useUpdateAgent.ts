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

const updateAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  modelId: z.string().min(1, "Model is required"),
});

type UpdateAgentData = z.infer<typeof updateAgentSchema>;

interface UseUpdateAgentProps {
  agentId: string;
  onSuccessCallback?: () => void;
}

export function useUpdateAgent({
  agentId,
  onSuccessCallback,
}: UseUpdateAgentProps) {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  const form = useForm<UpdateAgentData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: "",
      instructions: "",
      modelId: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateAgentData) => {
      return await agentsControllerUpdate(agentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindAllQueryKey()],
      });
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindOneQueryKey(agentId)],
      });
      toast.success(t("update.success"));
      onSuccessCallback?.();
    },
    onError: () => {
      toast.error(t("update.error"));
    },
  });

  const onSubmit = (data: UpdateAgentData) => {
    mutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
  };
}
