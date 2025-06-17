import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { usePromptsControllerUpdate } from "@/shared/api/generated/ayunisCoreAPI";
import {
  editPromptFormSchema,
  type EditPromptFormValues,
} from "../model/editPromptSchema";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";

interface UseEditPromptOptions {
  onSuccessCallback?: () => void;
}

export function useEditPrompt(options?: UseEditPromptOptions) {
  const queryClient = useQueryClient();
  const updatePromptMutation = usePromptsControllerUpdate();

  const form = useForm<EditPromptFormValues>({
    resolver: zodResolver(editPromptFormSchema),
    defaultValues: {
      id: "",
      title: "",
      content: "",
    },
  });

  function onSubmit(values: EditPromptFormValues) {
    const { id, ...rest } = values;
    updatePromptMutation.mutate(
      {
        id,
        data: rest,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["prompts"] });
          showSuccess("Prompt updated");
          if (options?.onSuccessCallback) {
            options.onSuccessCallback();
          }
        },
        onError: (error) => {
          console.error("Update prompt failed:", error);
          showError("Update prompt failed");
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    isLoading: updatePromptMutation.isPending,
  };
}
