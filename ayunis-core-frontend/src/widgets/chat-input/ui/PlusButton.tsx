import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Button } from "@/shared/ui/shadcn/button";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/shared/ui/shadcn/input";
import { useRef } from "react";
import { usePrompts } from "../api/usePrompts";
import { useTranslation } from "react-i18next";
import { showError } from "@/shared/lib/toast";

interface PlusButtonProps {
  onFileUpload: (file: File) => void;
  isCreatingFileSource?: boolean;
  isUploadingFile?: boolean;
  isFileSourceDisabled?: boolean;
  onPromptSelect: (content: string) => void;
}
export default function PlusButton({
  onFileUpload,
  isFileSourceDisabled,
  isUploadingFile,
  isCreatingFileSource,
  onPromptSelect,
}: PlusButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation("common");
  const {
    prompts,
    isLoading: isLoadingPrompts,
    error: promptsError,
  } = usePrompts();

  const handleFileChange = (file?: File) => {
    if (isFileSourceDisabled) {
      showError(t("chatInput.noEmbeddingModelEnabled"));
      return;
    }
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline">
            {isUploadingFile || isCreatingFileSource ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile || isCreatingFileSource}
            >
              {t("chatInput.uploadFile")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {t("chatInput.addPrompt")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {isLoadingPrompts ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common.loading")}
                  </DropdownMenuItem>
                ) : promptsError ? (
                  <DropdownMenuItem disabled className="text-destructive">
                    {t("chatInput.promptsLoadError")}
                  </DropdownMenuItem>
                ) : (
                  prompts.map((prompt) => (
                    <DropdownMenuItem
                      key={prompt.id}
                      onClick={() => onPromptSelect(prompt.content)}
                    >
                      {prompt.title}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="file"
        hidden
        accept=".pdf,.csv"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
        ref={fileInputRef}
      />
    </>
  );
}
