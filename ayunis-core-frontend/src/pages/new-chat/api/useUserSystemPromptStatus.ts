import { useChatSettingsControllerGetSystemPrompt } from '@/shared/api/generated/ayunisCoreAPI';

export function useUserSystemPromptStatus() {
  const { data, isLoading, isError } =
    useChatSettingsControllerGetSystemPrompt();

  return {
    hasSystemPrompt:
      data?.systemPrompt !== null && data?.systemPrompt !== undefined,
    isLoading,
    isError,
  };
}
