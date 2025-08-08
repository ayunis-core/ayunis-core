import { useRef } from "react";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import { Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddSourceButtonProps {
  onFileUpload: (file: File) => void;
  isCreatingFileSource?: boolean;
  disabled?: boolean;
}

export default function AddSourceButton({
  onFileUpload,
  isCreatingFileSource,
  disabled,
}: AddSourceButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation("common");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.md"
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="flex items-center gap-2 h-6 w-6"
              disabled={disabled ?? isCreatingFileSource ?? false}
              onClick={handleFileUpload}
            >
              {isCreatingFileSource ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("chatInput.uploadFile")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
