import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Workflow } from 'lucide-react';
import { useThreadArtifacts } from '@/pages/chat/api/useThreadArtifacts';
import { findLatestArtifactId } from '@/pages/chat/lib/find-latest-artifact-id';
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
        {t('chat.tools.create_bpmn.created')}
      </span>
    );
  }
  if (isStreaming) {
    return t('chat.tools.create_bpmn.generating');
  }
  return t('chat.tools.create_bpmn.title');
}

interface CreateBpmnWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateBpmnWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateBpmnWidgetProps) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    title?: string;
    content?: string;
  };

  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId = findLatestArtifactId(artifacts, params.title, 'bpmn');

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
      title={params.title || t('chat.tools.create_bpmn.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.create_bpmn.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
      icon={Workflow}
    />
  );
}
