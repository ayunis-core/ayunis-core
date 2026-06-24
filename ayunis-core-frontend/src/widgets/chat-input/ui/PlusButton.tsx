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
import { Brain, Loader2, Paperclip, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { useRef } from 'react';
import { useKnowledgeBases } from '../api/useKnowledgeBases';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useNavigate } from '@tanstack/react-router';
import {
  separateFilesByType,
  createFileListFromFiles,
} from '../utils/fileHandlers';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { useIsKnowledgeBasesEnabled } from '@/features/feature-toggles';
import { IntegrationsSubmenu } from './IntegrationsSubmenu';

interface PlusButtonProps {
  onFileUpload: (files: File[]) => void;
  onImageSelect?: (files: FileList | null) => void;
  isFileSourceDisabled?: boolean;
  isImageUploadDisabled?: boolean;
  onKnowledgeBaseSelect?: (knowledgeBase: KnowledgeBaseSummary) => void;
  attachedKnowledgeBaseIds?: string[];
  onIntegrationSelect?: (integration: IntegrationSummary) => void;
  attachedIntegrationIds?: string[];
}

export default function PlusButton({
  onFileUpload,
  onImageSelect,
  isFileSourceDisabled,
  isImageUploadDisabled = false,
  onKnowledgeBaseSelect,
  attachedKnowledgeBaseIds = [],
  onIntegrationSelect,
  attachedIntegrationIds = [],
}: Readonly<PlusButtonProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Single entry point for all uploads. Splits the selection by type and routes
  // each category through its existing callback, skipping (and toasting for) any
  // category whose upload is disabled — mirroring the drag-drop UX in useFileDrop.
  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const { images, regularFiles } = separateFilesByType(files);
    let hasSkippedFiles = false;

    if (regularFiles.length > 0) {
      if (isFileSourceDisabled) {
        hasSkippedFiles = true;
      } else {
        onFileUpload(regularFiles);
      }
    }

    if (images.length > 0) {
      if (isImageUploadDisabled || !onImageSelect) {
        hasSkippedFiles = true;
      } else {
        onImageSelect(createFileListFromFiles(images));
      }
    }

    if (hasSkippedFiles) {
      showError(t('chatInput.invalidDroppedFileType'));
    }

    // Reset input to allow selecting the same file(s) again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              <span>{t('chatInput.uploadFile')}</span>
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
          {onIntegrationSelect && (
            <IntegrationsSubmenu
              onIntegrationSelect={onIntegrationSelect}
              attachedIntegrationIds={attachedIntegrationIds}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="file"
        hidden
        multiple
        accept="image/*,.pdf,.csv,.xlsx,.xls,.docx,.pptx,.txt,.md,.mp3,.m4a,.wav,.webm"
        onChange={(e) => handleFileChange(e.target.files)}
        ref={fileInputRef}
      />
    </Tooltip>
  );
}
