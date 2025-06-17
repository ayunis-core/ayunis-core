import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSourcesControllerCreateUrlSource } from "@/shared/api";
import type { CreateUrlSourceDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import {
  addUrlSourceFormSchema,
  type AddUrlSourceFormValues,
} from "../model/addUrlSourceSchema";

interface UseAddUrlSourceProps {
  threadId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useAddUrlSource({
  threadId,
  onSuccess,
  onError,
}: UseAddUrlSourceProps = {}) {
  const createUrlSourceMutation = useSourcesControllerCreateUrlSource();

  const form = useForm<AddUrlSourceFormValues>({
    resolver: zodResolver(addUrlSourceFormSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = (values: AddUrlSourceFormValues) => {
    const data: CreateUrlSourceDto = {
      url: values.url,
      threadId,
    };

    createUrlSourceMutation.mutate(
      { data },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
        onError: (error) => {
          console.error("Failed to create URL source:", error);
          onError?.(error);
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: createUrlSourceMutation.isPending,
    error: createUrlSourceMutation.error,
  };
}
