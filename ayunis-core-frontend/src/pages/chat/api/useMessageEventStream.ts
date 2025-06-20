import { useEffect, useRef, useCallback } from "react";
import {
  type ErrorResponseDto,
  type RunMessageResponseDto,
  type RunErrorResponseDto,
  type RunsControllerConnectToStream200,
  type RunSessionResponseDto,
  type RunThreadResponseDto,
} from "@/shared/api";
import config from "@/shared/config";
import { useQueryClient } from "@tanstack/react-query";

interface UseMessageEventStreamParams {
  threadId: string;
  onMessageEvent: (data: RunMessageResponseDto) => void;
  onSessionEvent: (data: RunSessionResponseDto) => void;
  onThreadEvent: (data: RunThreadResponseDto) => void;
  onErrorEvent: (data: ErrorResponseDto) => void;
  onConnected?: () => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export function useMessageEventStream({
  threadId,
  onMessageEvent,
  onSessionEvent,
  onThreadEvent,
  onErrorEvent,
  onConnected,
  onError,
  onDisconnect,
}: UseMessageEventStreamParams) {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(async () => {
    try {
      // Clean up any existing connection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const url = `${config.api.baseUrl}/runs/stream/${threadId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Signal that we're connected
      isConnectedRef.current = true;
      onConnected?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = line.slice(6).trim();
              if (data === "") continue; // Skip empty data lines

              const parsedData = JSON.parse(
                data,
              ) as RunsControllerConnectToStream200;

              // Handle different event types based on the value structure
              if (parsedData && typeof parsedData === "object") {
                // Check if it's a message event
                if ("type" in parsedData && parsedData.type === "message") {
                  onMessageEvent(parsedData as RunMessageResponseDto);
                }
                // Check if it's a session event
                else if (
                  "type" in parsedData &&
                  parsedData.type === "session"
                ) {
                  onSessionEvent(parsedData as RunSessionResponseDto);
                  queryClient.invalidateQueries({
                    queryKey: ["threads", threadId],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["threads"],
                  });
                }
                // Check if it's a thread event
                else if ("type" in parsedData && parsedData.type === "thread") {
                  queryClient.invalidateQueries({
                    queryKey: ["threads", threadId],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["threads"],
                  });
                  onThreadEvent(parsedData as RunThreadResponseDto);
                }
                // Check if it's an error event
                else if ("type" in parsedData && parsedData.type === "error") {
                  onErrorEvent(parsedData as RunErrorResponseDto);
                }
              }
            } catch (parseError) {
              console.warn(
                "Failed to parse SSE message:",
                parseError,
                "Line:",
                line,
              );
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Connection was intentionally aborted, don't treat as error
        return;
      }

      const err =
        error instanceof Error ? error : new Error("Stream connection error");
      onError?.(err);
    } finally {
      const wasConnected = isConnectedRef.current;
      isConnectedRef.current = false;
      if (wasConnected) {
        onDisconnect?.();
      }
    }
  }, [
    threadId,
    onMessageEvent,
    onSessionEvent,
    onThreadEvent,
    onErrorEvent,
    onConnected,
    onError,
    onDisconnect,
  ]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const wasConnected = isConnectedRef.current;
    isConnectedRef.current = false;
    if (wasConnected) {
      onDisconnect?.();
    }
  }, [onDisconnect]);

  // Auto-connect when threadId changes
  useEffect(() => {
    if (threadId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [threadId]); // Only depend on threadId

  return {
    connect,
    disconnect,
    isConnected: isConnectedRef.current,
  };
}
