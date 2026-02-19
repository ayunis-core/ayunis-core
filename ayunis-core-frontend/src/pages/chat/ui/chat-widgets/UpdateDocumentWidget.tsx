import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { DocumentWidgetCard } from './DocumentWidgetCard';

interface UpdateDocumentWidgetProps {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function UpdateDocumentWidget({
  content,
  isStreaming = false,
  onOpenArtifact,
}: UpdateDocumentWidgetProps) {
  const { t } = useTranslation('chat');

  const params = (content.params || {}) as {
    artifact_id?: string;
    content?: string;
  };

  const artifactId = params.artifact_id || '';

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  };

  const statusLabel =
    !isStreaming && artifactId ? (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.update_document.updated')}
      </span>
    ) : isStreaming ? (
      t('chat.tools.update_document.generating')
    ) : (
      t('chat.tools.update_document.title')
    );

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={t('chat.tools.update_document.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.update_document.openInEditor')}
      artifactId={artifactId || null}
      onOpen={handleOpen}
    />
  );
}
