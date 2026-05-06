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
import { Badge } from '@/shared/ui/shadcn/badge';
import { Brain, FileText, Image, Loader2, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { useRef } from 'react';
import { useKnowledgeBases } from '../api/useKnowledgeBases';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useNavigate } from '@tanstack/react-router';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import type { KnowledgeBaseSummary } from '@/shared/contexts/chat/chatContext';
import { useIsKnowledgeBasesEnabled } from '@/features/feature-toggles';

interface PlusButtonProps {
  onFileUpload: (file: File) => void;
  onImageSelect?: (files: FileList | null) => void;
  isFileSourceDisabled?: boolean;
  isImageUploadDisabled?: boolean;
  onKnowledgeBaseSelect?: (knowledgeBase: KnowledgeBaseSummary) => void;
  attachedKnowledgeBaseIds?: string[];
}

export default function PlusButton({
  onFileUpload,
  onImageSelect,
  isFileSourceDisabled,
  isImageUploadDisabled = false,
  onKnowledgeBaseSelect,
  attachedKnowledgeBaseIds = [],
}: Readonly<PlusButtonProps>) {
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const {
    knowledgeBases,
    isLoading: isLoadingKBs,
    error: kbsError,
  } = useKnowledgeBases({
    enabled: !!onKnowledgeBaseSelect && knowledgeBasesEnabled,
  });

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

  // Filter out already-attached knowledge bases
  const availableKBs = knowledgeBases.filter(
    (kb) => !attachedKnowledgeBaseIds.includes(kb.id),
  );

  return (
    <Tooltip>
      <TooltipContent>{t('chatInput.addButtonTooltip')}</TooltipContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              disabled={isFileSourceDisabled && isImageUploadDisabled}
              aria-label={t('chatInput.addButtonTooltip')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <TooltipIf
              condition={isFileSourceDisabled ?? false}
              tooltip={t('chatInput.fileSourceDisabled')}
            >
              <DropdownMenuItem
                onClick={() => documentInputRef.current?.click()}
                disabled={isFileSourceDisabled}
              >
                <FileText className="h-4 w-4" />
                <span>{t('chatInput.uploadDocument')}</span>
              </DropdownMenuItem>
            </TooltipIf>
            <DropdownMenuItem
              onClick={() => imageInputRef.current?.click()}
              disabled={isImageUploadDisabled}
            >
              <Image className="h-4 w-4" />
              <span>{t('chatInput.uploadImage')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {onKnowledgeBaseSelect && knowledgeBasesEnabled && (
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Brain className="h-4 w-4" />
                  {t('chatInput.addKnowledgeBase')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {isLoadingKBs && (
                    <DropdownMenuItem disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </DropdownMenuItem>
                  )}
                  {!isLoadingKBs && !!kbsError && (
                    <DropdownMenuItem disabled className="text-destructive">
                      {t('chatInput.knowledgeBasesLoadError')}
                    </DropdownMenuItem>
                  )}
                  {!isLoadingKBs && !kbsError && availableKBs.length === 0 && (
                    <DropdownMenuItem disabled>
                      {t(
                        knowledgeBases.length === 0
                          ? 'chatInput.knowledgeBasesEmptyState'
                          : 'chatInput.knowledgeBasesAllAttached',
                      )}
                    </DropdownMenuItem>
                  )}
                  {!isLoadingKBs && !kbsError && availableKBs.length > 0
                    ? availableKBs.map((kb) => (
                        <DropdownMenuItem
                          key={kb.id}
                          onClick={() =>
                            onKnowledgeBaseSelect({
                              id: kb.id,
                              name: kb.name,
                            })
                          }
                        >
                          {kb.name}
                          {kb.isShared && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {t('chatInput.shared')}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))
                    : null}
                  <DropdownMenuItem
                    onClick={() => void navigate({ to: '/knowledge-bases' })}
                  >
                    <Plus /> {t('chatInput.createKnowledgeBase')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="file"
        hidden
        accept=".pdf,.csv,.xlsx,.xls,.docx,.pptx,.txt,.md"
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
