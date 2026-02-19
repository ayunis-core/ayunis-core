import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { FileText, ExternalLink, Check } from 'lucide-react';
import { useThreadArtifacts } from '../../api/useThreadArtifacts';

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

  const params = (content.params || {}) as {
    title?: string;
    content?: string;
  };

  // Artifact is created by the backend during the run.
  // We look it up from the thread artifacts list by title.
  // When multiple artifacts share the same title, prefer the most recently created one.
  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId =
    artifacts
      .filter((a) => a.title === params.title)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]?.id ?? null;

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
