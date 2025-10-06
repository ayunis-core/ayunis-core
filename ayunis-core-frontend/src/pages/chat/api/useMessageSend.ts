import {
  type SendMessageDto,
  type TextInput,
  type ToolResultInput,
  TextInputType,
  ToolResultInputType,
  type RunSessionResponseDto,
  type RunMessageResponseDto,
  type RunErrorResponseDto,
  type RunThreadResponseDto,
} from "@/shared/api";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useCallback, useRef } from "react";
import config from "@/shared/config";
import { useQueryClient } from "@tanstack/react-query";
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

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
  onMessageEvent?: (data: RunMessageResponseDto) => void;
  onSessionEvent?: (data: RunSessionResponseDto) => void;
  onThreadEvent?: (data: RunThreadResponseDto) => void;
  onErrorEvent?: (data: RunErrorResponseDto) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export function useMessageSend(params: UseMessageSendParams) {
  const { t } = useTranslation("chats");
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);

  const sendMessage = useCallback(
    async (sendMessageDto: SendMessageDto) => {
      try {
        // Clean up any existing connection
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        isLoadingRef.current = true;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const url = `${config.api.baseUrl}/runs/send-message`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          credentials: "include",
          body: JSON.stringify(sendMessageDto),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("HTTP error:", { status: response.status, errorText });
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });

            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              // Handle SSE comment lines
              if (line.startsWith(":")) {
                continue;
              }

              // Handle SSE data lines
              if (line.startsWith("data: ")) {
                try {
                  const jsonData = line.slice(6);
                  const data = JSON.parse(jsonData);
                  eventCount++;

                  switch (data.type) {
                    case "session":
                      params.onSessionEvent?.(data as RunSessionResponseDto);
                      break;
                    case "message":
                      params.onMessageEvent?.(data as RunMessageResponseDto);
                      console.log("Message", data);
                      break;
                    case "thread":
                      params.onThreadEvent?.(data as RunThreadResponseDto);
                      break;
                    case "error":
                      params.onErrorEvent?.(data as RunErrorResponseDto);
                      console.log("Error", data);
                      break;
                    default:
                      console.warn("Unknown SSE event type:", data.type);
                  }
                } catch (parseError) {
                  console.warn("Failed to parse SSE data:", line, parseError);
                }
              }
            }
          }
        } catch (readerError) {
          console.error("Error reading SSE stream:", readerError);
          throw readerError;
        }

        params.onComplete?.();
      } catch (error) {
        console.error("Error in sendMessage", error);

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            return; // Request was cancelled, don't show error
          }

          // Handle specific error status codes
          if (error.message.includes("403")) {
            showError(t("chat.upgradeToProError"));
          } else {
            params.onError?.(error);
          }
        }
      } finally {
        isLoadingRef.current = false;
        [
          getThreadsControllerFindOneQueryKey(params.threadId),
          getThreadsControllerFindAllQueryKey(),
        ].forEach((queryKey) => {
          queryClient.invalidateQueries({
            queryKey,
          });
        });
      }
    },
    [params, t],
  );

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

      return sendMessage(sendMessageDto);
    },
    [params.threadId, sendMessage],
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

      return sendMessage(sendMessageDto);
    },
    [params.threadId, sendMessage],
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isLoadingRef.current = false;
  }, []);

  return {
    sendTextMessage,
    sendToolResult,
    abort,
    isLoading: isLoadingRef.current,
  };
}
