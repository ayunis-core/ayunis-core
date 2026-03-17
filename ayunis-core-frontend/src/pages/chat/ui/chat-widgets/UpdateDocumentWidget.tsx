import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { DocumentWidgetCard } from './DocumentWidgetCard';

// eslint-disable-next-line sonarjs/function-return-type -- intentional: returns JSX or string, both valid ReactNode
function getUpdateStatusLabel(
  artifactId: string,
  isStreaming: boolean,
  t: TFunction<'chat'>,
): ReactNode {
  if (!isStreaming && artifactId) {
    return (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.update_document.updated')}
      </span>
    );
  }
  if (isStreaming) {
    return t('chat.tools.update_document.generating');
  }
  return t('chat.tools.update_document.title');
}

interface UpdateDocumentWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function UpdateDocumentWidget({
  content,
  isStreaming = false,
  onOpenArtifact,
}: UpdateDocumentWidgetProps) {
  const { t } = useTranslation('chat');

  const params = content.params as {
    artifact_id?: string;
    content?: string;
  };

  const artifactId = params.artifact_id ?? '';

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  };

  const statusLabel = getUpdateStatusLabel(artifactId, isStreaming, t);

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
