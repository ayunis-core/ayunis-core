import { useRef } from "react";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import { Loader2, Paperclip } from "lucide-react";
import { useFileSource } from "../api/useFileSource";

interface AddSourceButtonProps {
  threadId?: string;
}

export default function AddSourceButton({ threadId }: AddSourceButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isLoading: isCreatingFileSource } = useFileSource({
    threadId,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile({
        file,
        name: file.name,
        description: `File source: ${file.name}`,
      });
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
              className="flex items-center gap-2"
              disabled={isCreatingFileSource}
              onClick={handleFileUpload}
            >
              {isCreatingFileSource ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload file</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
