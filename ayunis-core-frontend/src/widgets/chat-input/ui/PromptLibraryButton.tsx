import { useState } from "react";
import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { BookOpen, Loader2 } from "lucide-react";
import { usePrompts } from "../api/usePrompts";
import { useTranslation } from "node_modules/react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";

interface PromptLibraryButtonProps {
  onPromptSelect: (content: string) => void;
}

export default function PromptLibraryButton({
  onPromptSelect,
}: PromptLibraryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { prompts, isLoading, error } = usePrompts();
  const { t } = useTranslation("common");

  const handlePromptSelect = (content: string) => {
    onPromptSelect(content);
    setIsOpen(false);
  };

  const renderDropdownContent = () => {
    if (isLoading) {
      return (
        <DropdownMenuItem disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t("common.loading")}
        </DropdownMenuItem>
      );
    }

    if (error) {
      return (
        <DropdownMenuItem disabled className="text-destructive">
          {t("chatInput.promptsLoadError")}
        </DropdownMenuItem>
      );
    }

    if (prompts.length === 0) {
      return (
        <DropdownMenuItem disabled>
          {t("chatInput.noPromptsAvailable")}
        </DropdownMenuItem>
      );
    }

    return prompts.map((prompt) => (
      <DropdownMenuItem
        key={prompt.id}
        onClick={() => handlePromptSelect(prompt.content)}
        className="flex flex-col items-start p-3 cursor-pointer"
      >
        {prompt.title}
      </DropdownMenuItem>
    ));
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent
            align="start"
            className="w-80 max-h-96 overflow-y-auto"
          >
            {renderDropdownContent()}
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>{t("chatInput.selectPrompt")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
