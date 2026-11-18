import { useChatSettingsControllerGetSystemPrompt } from '@/shared/api/generated/ayunisCoreAPI';

export function useUserSystemPromptStatus(enabled = true) {
  const { data, isLoading, isError } = useChatSettingsControllerGetSystemPrompt(
    { query: { enabled } },
  );

  return {
    hasSystemPrompt:
      data?.systemPrompt !== null && data?.systemPrompt !== undefined,
    isLoading,
    isError,
  };
}
