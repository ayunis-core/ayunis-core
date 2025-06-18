import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/shared/ui/shadcn/button";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/shadcn/card";
import ModelSelector from "./ModelSelector";
import PromptLibraryButton from "./PromptLibraryButton";
import useKeyboardShortcut from "@/features/useKeyboardShortcut";
import type { PermittedModel } from "../model/openapi";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  model: PermittedModel;
  isStreaming?: boolean;
  onModelChange: (model: PermittedModel) => void;
  internetSearch: boolean;
  onInternetSearchChange: (internetSearch: boolean) => void;
  codeExecution: boolean;
  onCodeExecutionChange: (codeExecution: boolean) => void;
  onSend: (message: string) => void;
  prefilledPrompt?: string;
}

export default function ChatInput({
  model,
  isStreaming,
  onModelChange,
  onSend,
  prefilledPrompt,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [message, setMessage] = useState(prefilledPrompt ?? "");
  const { t } = useTranslation("common");

  useKeyboardShortcut(["Enter"], () => isFocused && handleSend());
  useKeyboardShortcut(
    ["Shift", "Enter"],
    () => isFocused && setMessage((m) => m + "\n"),
  );

  function handleSend() {
    if (!message.trim() || !model) return;

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
                <ModelSelector selectedModel={model} onChange={onModelChange} />
                <PromptLibraryButton onPromptSelect={handlePromptSelect} />
                {/* <ToolsButton
                  internetSearch={internetSearch}
                  codeExecution={codeExecution}
                  onInternetSearchChange={onInternetSearchChange}
                  onCodeExecutionChange={onCodeExecutionChange}
                />

                <AddSourceButton threadId={"1"} /> */}
              </div>

              {/* Right side */}
              <div className="flex-shrink-0 flex space-x-2">
                {isStreaming ? (
                  <Button size="icon" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    disabled={!message.trim() || !model}
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
