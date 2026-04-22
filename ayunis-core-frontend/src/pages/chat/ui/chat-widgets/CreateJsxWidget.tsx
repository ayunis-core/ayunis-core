import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Code } from 'lucide-react';
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
        {t('chat.tools.create_jsx.created')}
      </span>
    );
  }
  if (isStreaming) {
    return t('chat.tools.create_jsx.generating');
  }
  return t('chat.tools.create_jsx.title');
}

interface CreateJsxWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateJsxWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateJsxWidgetProps) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    title?: string;
    content?: string;
  };

  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId =
    artifacts
      .filter((a) => a.title === params.title && a.type === 'jsx')
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
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string during streaming should fall back to translation
      title={params.title || t('chat.tools.create_jsx.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.create_jsx.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
      icon={Code}
    />
  );
}
