import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/shared/ui/shadcn/tooltip';
import { Loader2, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { useRef } from 'react';
import { usePrompts } from '../api/usePrompts';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useNavigate } from '@tanstack/react-router';
import type { PendingImage } from '../hooks/usePendingImages';

interface PlusButtonProps {
  onFileUpload: (file: File) => void;
  onImageSelect?: (files: FileList | null) => void;
  isCreatingFileSource?: boolean;
  isUploadingFile?: boolean;
  isFileSourceDisabled?: boolean;
  onPromptSelect: (content: string) => void;
  pendingImages?: PendingImage[];
  threadId?: string;
}

export default function PlusButton({
  onFileUpload,
  onImageSelect,
  isFileSourceDisabled,
  isUploadingFile,
  isCreatingFileSource,
  onPromptSelect,
  pendingImages = [],
  threadId,
}: PlusButtonProps) {
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const {
    prompts,
    isLoading: isLoadingPrompts,
    error: promptsError,
  } = usePrompts();

  // Check if images are uploading (based on whether they have objectName)
  const isUploadingImages = threadId
    ? pendingImages.some((img) => !img.objectName)
    : false;

  const handleDocumentChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Only allow single document upload
    const file = files[0];
    if (isFileSourceDisabled) {
      showError(t('chatInput.noEmbeddingModelEnabled'));
      return;
    }
    onFileUpload(file);

    // Reset input to allow selecting the same file again
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (onImageSelect) {
      onImageSelect(files);
    }

    // Reset input to allow selecting the same files again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const isLoading =
    isUploadingFile || isCreatingFileSource || isUploadingImages;

  return (
    <Tooltip>
      <TooltipContent>{t('chatInput.addButtonTooltip')}</TooltipContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => documentInputRef.current?.click()}
              disabled={isLoading || isFileSourceDisabled}
            >
              {t('chatInput.uploadDocument')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading}
            >
              {t('chatInput.uploadImage')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {t('chatInput.addPrompt')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {isLoadingPrompts ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </DropdownMenuItem>
                ) : promptsError ? (
                  <DropdownMenuItem disabled className="text-destructive">
                    {t('chatInput.promptsLoadError')}
                  </DropdownMenuItem>
                ) : prompts.length === 0 ? (
                  <DropdownMenuItem disabled>
                    {t('chatInput.promptsEmptyState')}
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
                <DropdownMenuItem
                  onClick={() => void navigate({ to: '/prompts' })}
                >
                  <Plus /> {t('chatInput.createFirstPrompt')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="file"
        hidden
        accept=".pdf,.csv"
        onChange={(e) => handleDocumentChange(e.target.files)}
        ref={documentInputRef}
      />
      <Input
        type="file"
        hidden
        accept="image/*"
        multiple
        onChange={(e) => handleImageChange(e.target.files)}
        ref={imageInputRef}
      />
    </Tooltip>
  );
}
