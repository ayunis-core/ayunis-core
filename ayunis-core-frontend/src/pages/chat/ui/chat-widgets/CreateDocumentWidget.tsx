import { useEffect, useRef } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { FileText, ExternalLink, Check } from 'lucide-react';
import { useCreateArtifact } from '../../api/useCreateArtifact';
import { AuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface CreateDocumentWidgetProps {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
  threadId: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateDocumentWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateDocumentWidgetProps) {
  const { t } = useTranslation('chat');
  const createdRef = useRef<string | null>(null);

  const params = (content.params || {}) as {
    title?: string;
    content?: string;
  };

  const { createArtifact, isCreating, data } = useCreateArtifact(
    threadId,
    () => {
      // onSuccess — artifact was created
    },
  );

  const artifactId = data?.id ?? null;

  // Auto-create the artifact once streaming is done and we have content
  useEffect(() => {
    if (
      !isStreaming &&
      createdRef.current !== content.id &&
      params.title &&
      params.content
    ) {
      createdRef.current = content.id;
      createArtifact({
        title: params.title,
        content: params.content,
        threadId,
        authorType: AuthorType.ASSISTANT,
      });
    }
  }, [
    isStreaming,
    params.title,
    params.content,
    threadId,
    createArtifact,
    content.id,
  ]);

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  };

  return (
    <div
      className="my-2 w-full rounded-lg border bg-card p-4"
      key={`${content.name}-${content.id}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-lg bg-primary/10',
            isStreaming && 'animate-pulse',
          )}
        >
          <FileText className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isStreaming && 'animate-pulse',
            )}
          >
            {params.title || t('chat.tools.create_document.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {artifactId ? (
              <span className="flex items-center gap-1">
                <Check className="size-3" />
                {t('chat.tools.create_document.created')}
              </span>
            ) : isCreating ? (
              t('chat.tools.create_document.creating')
            ) : isStreaming ? (
              t('chat.tools.create_document.generating')
            ) : (
              t('chat.tools.create_document.title')
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!artifactId}
          onClick={handleOpen}
        >
          <ExternalLink className="mr-1 size-3.5" />
          {t('chat.tools.create_document.openInEditor')}
        </Button>
      </div>
    </div>
  );
}
