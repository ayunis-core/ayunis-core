import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Mail } from 'lucide-react';
import { useThreadArtifacts } from '../../api/useThreadArtifacts';
import { findLatestArtifactId } from '../../lib/find-latest-artifact-id';
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
        {t('chat.tools.create_email.created')}
      </span>
    );
  }
  return isStreaming
    ? t('chat.tools.create_email.generating')
    : t('chat.tools.create_email.title');
}

interface CreateEmailWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateEmailWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateEmailWidgetProps) {
  const { t } = useTranslation('chat');
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as { subject?: string };
  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId = findLatestArtifactId(artifacts, params.subject, 'email');

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) onOpenArtifact(artifactId);
  };

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={params.subject || t('chat.tools.create_email.title')}
      statusLabel={getCreateStatusLabel(artifactId, isStreaming, t)}
      buttonLabel={t('chat.tools.create_email.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
      icon={Mail}
    />
  );
}
