import { useRef, useState } from "react";
import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import { Link, Upload, Loader2, Paperclip } from "lucide-react";
import AddUrlSourceDialog from "./AddUrlSourceDialog";
import { useFileSource } from "../api/useFileSource";

interface AddSourceButtonProps {
  threadId?: string;
}

export default function AddSourceButton({ threadId }: AddSourceButtonProps) {
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isLoading: isCreatingFileSource } = useFileSource({
    threadId,
    onSuccess: () => {
      console.log("File uploaded successfully");
    },
    onError: (error) => {
      // Handle error appropriately - could show toast notification
      console.error("Failed to add source:", error);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile({
        file,
      });
      // Reset the input
      event.target.value = "";
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUrlSuccess = () => {
    // TODO: Handle URL success
  };

  const handleUrlError = (error: any) => {
    // Handle error appropriately - could show toast notification
    console.error("Failed to add URL source:", error);
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
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isCreatingFileSource}
                >
                  {isCreatingFileSource ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={handleFileUpload}
                disabled={isCreatingFileSource}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsUrlDialogOpen(true)}
                disabled={isCreatingFileSource}
              >
                <Link className="mr-2 h-4 w-4" />
                Add URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipContent>
            <p>Add files or websites</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AddUrlSourceDialog
        threadId={threadId}
        isOpen={isUrlDialogOpen}
        onOpenChange={setIsUrlDialogOpen}
        onSuccess={handleUrlSuccess}
        onError={handleUrlError}
      />
    </>
  );
}
