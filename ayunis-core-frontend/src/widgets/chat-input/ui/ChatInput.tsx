import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/shared/ui/shadcn/button";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/shadcn/card";
import ModelSelector from "./ModelSelector";
import PromptLibraryButton from "./PromptLibraryButton";
import useKeyboardShortcut from "@/features/useKeyboardShortcut";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  modelOrAgentId: string | undefined;
  isStreaming?: boolean;
  onModelChange: (modelId: string) => void;
  onAgentChange: (agentId: string) => void;
  onSend: (message: string) => void;
  prefilledPrompt?: string;
}

export default function ChatInput({
  modelOrAgentId,
  isStreaming,
  onModelChange,
  onAgentChange,
  onSend,
  prefilledPrompt,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [message, setMessage] = useState(prefilledPrompt ?? "");
  const { t } = useTranslation("common");

  useKeyboardShortcut(
    ["Shift", "Enter"],
    () => isFocused && setMessage((m) => m + "\n"),
  );

  useKeyboardShortcut(["Enter"], () => isFocused && handleSend(), {
    exclusive: true,
  });

  function handleSend() {
    if (!message.trim() || !modelOrAgentId) return;

    onSend(message);
    setMessage(""); // Clear message after sending
  }

  function handlePromptSelect(promptContent: string) {
    // Add the prompt content to the existing message
    // If there's already content, add a space before the prompt
    setMessage((prev) => (prev ? `${prev} ${promptContent}` : promptContent));
  }

  return (
    <div className="w-full space-y-2">
      {/* Main input section */}
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex flex-col gap-4">
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
                <ModelSelector
                  selectedModelOrAgentId={modelOrAgentId}
                  onModelChange={onModelChange}
                  onAgentChange={onAgentChange}
                />
                <PromptLibraryButton onPromptSelect={handlePromptSelect} />
              </div>

              {/* Right side */}
              <div className="flex-shrink-0 flex space-x-2">
                {isStreaming ? (
                  <Button size="icon" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    disabled={!message.trim() || !modelOrAgentId}
                    size="icon"
                    onClick={handleSend}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
