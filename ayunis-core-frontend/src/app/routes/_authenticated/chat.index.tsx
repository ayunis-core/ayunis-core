import { createFileRoute } from "@tanstack/react-router";
import { NewChatPage, NewChatPageNoModelError } from "@/pages/new-chat";
import {
  modelsControllerGetEffectiveDefaultModel,
  promptsControllerFindOne,
  type PermittedModelResponseDto,
} from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";
import { z } from "zod";

const queryDefaultModelOptions = () => ({
  queryKey: ["models"],
  queryFn: () => modelsControllerGetEffectiveDefaultModel(),
});

const queryPromptOptions = (prompt: string) => ({
  queryKey: ["prompts", prompt],
  queryFn: () => promptsControllerFindOne(prompt),
});

const searchSchema = z.object({
  prompt: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/chat/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { prompt: promptId }, context: { queryClient } }) => {
    const defaultModel: PermittedModelResponseDto =
      await queryClient.ensureQueryData(queryDefaultModelOptions());
    if (promptId) {
      const prompt = await queryClient.ensureQueryData(
        queryPromptOptions(promptId),
      );
      return { defaultModel, prefilledPrompt: prompt?.content };
    }
    return { defaultModel };
  },
  errorComponent: ({ error }) => {
    const { code } = extractErrorData(error);
    if (code === "MODEL_NOT_FOUND") {
      return <NewChatPageNoModelError />;
    }
    return <NewChatPageNoModelError />;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { defaultModel, prefilledPrompt } = Route.useLoaderData();
  return (
    <NewChatPage
      defaultModel={defaultModel}
      prefilledPrompt={prefilledPrompt}
    />
  );
}
