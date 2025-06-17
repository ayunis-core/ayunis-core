import { useCallback } from "react";
import {
  useRunsControllerSendMessage,
  type SendMessageDto,
  type TextInput,
  type ToolResultInput,
  TextInputType,
  ToolResultInputType,
} from "@/shared/api";

interface SendMesageInput {
  text: string;
}

interface SendToolResultInput {
  toolId: string;
  toolName: string;
  result: string;
}

interface UseMessageSendParams {
  threadId: string;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
}

export function useMessageSend(params: UseMessageSendParams) {
  const mutation = useRunsControllerSendMessage({
    mutation: {
      onSuccess: params.onSuccess,
      onError: params.onError,
    },
  });

  const sendTextMessage = useCallback(
    (input: SendMesageInput) => {
      const textInput: TextInput = {
        type: TextInputType.text,
        text: input.text,
      };

      const sendMessageDto: SendMessageDto = {
        threadId: params.threadId,
        input: textInput,
        streaming: true,
      };

      return mutation.mutate({ data: sendMessageDto });
    },
    [mutation, params.threadId],
  );

  const sendToolResult = useCallback(
    (input: SendToolResultInput) => {
      const toolResultInput: ToolResultInput = {
        type: ToolResultInputType.tool_result,
        toolId: input.toolId,
        toolName: input.toolName,
        result: input.result,
      };

      const sendMessageDto: SendMessageDto = {
        threadId: params.threadId,
        input: toolResultInput,
      };

      return mutation.mutate({ data: sendMessageDto });
    },
    [mutation, params.threadId],
  );

  return {
    sendTextMessage,
    sendToolResult,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  };
}
