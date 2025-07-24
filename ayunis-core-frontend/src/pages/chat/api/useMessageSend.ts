import {
  useRunsControllerSendMessage,
  type SendMessageDto,
  type TextInput,
  type ToolResultInput,
  TextInputType,
  ToolResultInputType,
} from "@/shared/api";
import { AxiosError } from "axios";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

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
}

export function useMessageSend(params: UseMessageSendParams) {
  const { t } = useTranslation("chats");

  const mutation = useRunsControllerSendMessage({
    mutation: {
      onError: (error: AxiosError) => {
        console.log("error in useMessageSend", error);
        if (error.response?.status === 403) {
          showError(t("chat.upgradeToProError"));
        }
      },
    },
  });

  function sendTextMessage(input: SendMesageInput) {
    const textInput: TextInput = {
      type: TextInputType.text,
      text: input.text,
    };

    const sendMessageDto: SendMessageDto = {
      threadId: params.threadId,
      input: textInput,
      streaming: true,
    };

    return mutation.mutateAsync({ data: sendMessageDto });
  }

  function sendToolResult(input: SendToolResultInput) {
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

    return mutation.mutateAsync({ data: sendMessageDto });
  }

  return {
    sendTextMessage,
    sendToolResult,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
