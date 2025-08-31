// Types
import type { GenerateIcsDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Utils
import { useMutation } from "@tanstack/react-query";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

// API
import { calendarControllerGenerateIcs } from "@/shared/api/generated/ayunisCoreAPI";

export function useGenerateIcs() {
  const { t } = useTranslation("chats");

  const mutation = useMutation<string, unknown, GenerateIcsDto>({
    mutationFn: async (data: GenerateIcsDto): Promise<string> => {
      const raw = await calendarControllerGenerateIcs(data);
      const content: unknown = raw;

      if (!(typeof content === "string") || !content) {
        throw new Error("Invalid ICS response");
      }

      return content;
    },
    onError: () => {
      showError(t("chat.errorUnexpected"));
    },
  });

  return {
    generate: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
  };
}


