import { useState, forwardRef, useImperativeHandle } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/shared/ui/shadcn/button";
import {
  ArrowUp,
  Bot,
  DatabaseIcon,
  FileIcon,
  Square,
  XIcon,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/shadcn/card";
import AgentButton from "./AgentButton";
import useKeyboardShortcut from "@/features/useKeyboardShortcut";
import { useTranslation } from "react-i18next";
import type { SourceResponseDtoType } from "@/shared/api";
import { Badge } from "@/shared/ui/shadcn/badge";
import PlusButton from "./PlusButton";
import ModelSelector from "./ModelSelector";
import { useAgents } from "../../../features/useAgents";
import TooltipIf from "@/widgets/tooltip-if/ui/TooltipIf";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";

interface ChatInputProps {
  modelId: string | undefined;
  agentId: string | undefined;
  sources: { id: string; name: string; type: SourceResponseDtoType }[];
  isStreaming?: boolean;
  isCreatingFileSource?: boolean;
  isModelChangeDisabled: boolean;
  onModelChange: (modelId: string) => void;
  onAgentChange: (agentId: string) => void;
  onAgentRemove: (agentId: string) => void;
  onFileUpload: (file: File) => void;
  onRemoveSource: (sourceId: string) => void;
  onSend: (message: string) => Promise<void>;
  onSendCancelled: () => void;
  prefilledPrompt?: string;
  isEmbeddingModelEnabled: boolean;
}

export interface ChatInputRef {
  setMessage: (message: string) => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      modelId,
      agentId,
      sources,
      isStreaming,
      isCreatingFileSource,
      isModelChangeDisabled,
      onModelChange,
      onAgentChange,
      onAgentRemove,
      onFileUpload,
      onRemoveSource,
      onSend,
      onSendCancelled,
      prefilledPrompt,
      isEmbeddingModelEnabled,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [message, setMessage] = useState(prefilledPrompt ?? "");
    const { t } = useTranslation("common");
    const { agents } = useAgents();

    useImperativeHandle(ref, () => ({
      setMessage,
    }));

    useKeyboardShortcut(["Enter"], () => isFocused && handleSend(), {
      exclusive: true,
    });

    async function handleSend() {
      if (!message.trim() || !(modelId || agentId)) return;

      await onSend(message);
      setMessage(""); // Clear message after sending
    }

    function handlePromptSelect(promptContent: string) {
      // Add the prompt content to the existing message
      // If there's already content, add a space before the prompt
      setMessage((prev) => (prev ? `${prev} ${promptContent}` : promptContent));
    }

    function getSourceIcon(source: SourceResponseDtoType) {
      switch (source) {
        case "text":
          return <FileIcon className="h-3 w-3" />;
        case "data":
          return <DatabaseIcon className="h-3 w-3" />;
        default:
          return null;
      }
    }

    return (
      <div className="w-full space-y-2">
        {/* Main input section */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              {/* Sources */}
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  {sources.map((source) => (
                    <Badge
                      key={source.id}
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() => onRemoveSource(source.id)}
                    >
                      {getSourceIcon(source.type)}
                      {source.name}
                      <XIcon className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Textarea at the top */}
              <TextareaAutosize
                maxRows={10}
                value={message}
                autoFocus
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t("chatInput.placeholder")}
                className="border-0 border-none bg-transparent rounded-none resize-none focus:outline-none p-0"
              />

              {/* Bottom row */}
              <div className="flex items-center justify-between">
                {/* Left side */}

                <div className="flex-shrink-0 flex space-x-2">
                  <PlusButton
                    onFileUpload={onFileUpload}
                    isFileSourceDisabled={!isEmbeddingModelEnabled}
                    isCreatingFileSource={isCreatingFileSource}
                    onPromptSelect={handlePromptSelect}
                  />
                  <AgentButton
                    selectedAgentId={agentId}
                    onAgentChange={onAgentChange}
                  />
                  {agentId && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 rounded-full border-none"
                      onClick={() => onAgentRemove(agentId)}
                    >
                      <Bot className="h-3 w-3" />
                      {agents.find((a) => a.id === agentId)?.name}
                      <XIcon className="h-3 w-3 cursor-pointer" />
                    </Badge>
                  )}
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex space-x-2">
                  <TooltipIf
                    condition={isModelChangeDisabled}
                    tooltip={t("chatInput.modelChangeDisabledTooltip")}
                  >
                    <ModelSelector
                      isDisabled={isModelChangeDisabled}
                      selectedModelId={modelId}
                      onModelChange={onModelChange}
                    />
                  </TooltipIf>
                  {isStreaming ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            size="icon"
                            className="rounded-full"
                            onClick={onSendCancelled}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("chatInput.cancelTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            disabled={!message.trim() || !(modelId || agentId)}
                            className="rounded-full"
                            size="icon"
                            onClick={handleSend}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("chatInput.sendTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

ChatInput.displayName = "ChatInput";

export default ChatInput;
