import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  agentsControllerCreate,
  getAgentsControllerFindAllQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  modelId: z.string().min(1, "Model is required"),
});

type CreateAgentData = z.infer<typeof createAgentSchema>;

interface UseAddAgentProps {
  onSuccessCallback?: () => void;
}

export function useAddAgent({ onSuccessCallback }: UseAddAgentProps = {}) {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  const form = useForm<CreateAgentData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      instructions: "",
      modelId: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateAgentData) => {
      return await agentsControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindAllQueryKey()],
      });
      toast.success(t("create.success"));
      onSuccessCallback?.();
    },
    onError: () => {
      toast.error(t("create.error"));
    },
  });

  const onSubmit = (data: CreateAgentData) => {
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
