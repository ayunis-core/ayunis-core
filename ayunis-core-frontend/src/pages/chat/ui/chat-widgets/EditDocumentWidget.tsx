import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { DocumentWidgetCard } from './DocumentWidgetCard';

interface EditDocumentWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function EditDocumentWidget({
  content,
  isStreaming = false,
  onOpenArtifact,
}: EditDocumentWidgetProps) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    artifact_id?: string;
    edits?: unknown[];
  };

  const artifactId = params.artifact_id ?? '';

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  };

  const getStatusLabel = () => {
    if (!isStreaming && artifactId) {
      return (
        <span className="flex items-center gap-1">
          <Check className="size-3" />
          {t('chat.tools.edit_document.updated')}
        </span>
      );
    }
    if (isStreaming) {
      return <span>{t('chat.tools.edit_document.generating')}</span>;
    }
    return <span>{t('chat.tools.edit_document.title')}</span>;
  };

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={t('chat.tools.edit_document.title')}
      statusLabel={getStatusLabel()}
      buttonLabel={t('chat.tools.edit_document.openInEditor')}
      artifactId={artifactId || null}
      onOpen={handleOpen}
    />
  );
}
