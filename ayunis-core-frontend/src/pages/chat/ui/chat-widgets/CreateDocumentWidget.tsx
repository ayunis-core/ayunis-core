import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useThreadArtifacts } from '../../api/useThreadArtifacts';
import { DocumentWidgetCard } from './DocumentWidgetCard';

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

  const statusLabel = artifactId ? (
    <span className="flex items-center gap-1">
      <Check className="size-3" />
      {t('chat.tools.create_document.created')}
    </span>
  ) : isStreaming ? (
    t('chat.tools.create_document.generating')
  ) : (
    t('chat.tools.create_document.title')
  );

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={params.title || t('chat.tools.create_document.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.create_document.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
    />
  );
}
