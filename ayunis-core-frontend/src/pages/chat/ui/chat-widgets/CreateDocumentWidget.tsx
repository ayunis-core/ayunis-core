import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useThreadArtifacts } from '../../api/useThreadArtifacts';
import { DocumentWidgetCard } from './DocumentWidgetCard';

// eslint-disable-next-line sonarjs/function-return-type -- intentional: returns JSX or string, both valid ReactNode
function getCreateStatusLabel(
  artifactId: string | null,
  isStreaming: boolean,
  t: TFunction<'chat'>,
): ReactNode {
  if (artifactId) {
    return (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.create_document.created')}
      </span>
    );
  }
  if (isStreaming) {
    return t('chat.tools.create_document.generating');
  }
  return t('chat.tools.create_document.title');
}

interface CreateDocumentWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateDocumentWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateDocumentWidgetProps) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
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

  const statusLabel = getCreateStatusLabel(artifactId, isStreaming, t);

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentionally using || to fall back for empty strings during streaming
      title={params.title || t('chat.tools.create_document.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.create_document.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
    />
  );
}
