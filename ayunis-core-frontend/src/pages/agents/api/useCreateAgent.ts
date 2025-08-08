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
import { ToolAssignmentDtoType } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useRouter } from "@tanstack/react-router";

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  modelId: z.string().min(1, "Model is required"),
  toolAssignments: z.array(
    z.object({
      type: z.enum([
        ToolAssignmentDtoType.http,
        ToolAssignmentDtoType.source_query,
        ToolAssignmentDtoType.internet_search,
        ToolAssignmentDtoType.website_content,
      ]),
      toolConfigId: z.string().optional(),
    }),
  ),
});

export type CreateAgentData = z.infer<typeof createAgentSchema>;

interface UseCreateAgentProps {
  onSuccessCallback?: () => void;
}

export function useCreateAgent({
  onSuccessCallback,
}: UseCreateAgentProps = {}) {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<CreateAgentData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      instructions: "",
      modelId: "",
      toolAssignments: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateAgentData) => {
      return await agentsControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      toast.success(t("create.success"));
      form.reset();
      onSuccessCallback?.();
    },
    onError: () => {
      toast.error(t("create.error"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      router.invalidate();
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
