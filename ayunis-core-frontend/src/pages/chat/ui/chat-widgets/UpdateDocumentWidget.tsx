import { useEffect, useRef, useState } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { FileText, ExternalLink, Check } from 'lucide-react';
import { useUpdateArtifact } from '../../api/useUpdateArtifact';
import { AuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface UpdateDocumentWidgetProps {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
  threadId: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function UpdateDocumentWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: UpdateDocumentWidgetProps) {
  const { t } = useTranslation('chat');
  const updatedRef = useRef<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const params = (content.params || {}) as {
    artifact_id?: string;
    content?: string;
  };

  const artifactId = params.artifact_id || '';

  const { updateArtifact, isUpdating } = useUpdateArtifact({
    artifactId,
    threadId,
    onSuccess: () => {
      setUpdated(true);
    },
  });

  // Auto-update the artifact once streaming is done and we have content
  useEffect(() => {
    if (
      !isStreaming &&
      updatedRef.current !== content.id &&
      artifactId &&
      params.content
    ) {
      updatedRef.current = content.id;
      updateArtifact({
        content: params.content,
        authorType: AuthorType.ASSISTANT,
      });
    }
  }, [isStreaming, artifactId, params.content, updateArtifact, content.id]);

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
              'text-sm font-medium',
              isStreaming && 'animate-pulse',
            )}
          >
            {t('chat.tools.update_document.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {updated ? (
              <span className="flex items-center gap-1">
                <Check className="size-3" />
                {t('chat.tools.update_document.updated')}
              </span>
            ) : isUpdating ? (
              t('chat.tools.update_document.updating')
            ) : isStreaming ? (
              t('chat.tools.update_document.generating')
            ) : (
              t('chat.tools.update_document.title')
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
          {t('chat.tools.update_document.openInEditor')}
        </Button>
      </div>
    </div>
  );
}
