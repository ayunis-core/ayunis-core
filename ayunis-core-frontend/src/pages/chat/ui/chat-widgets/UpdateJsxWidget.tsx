import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Code } from 'lucide-react';
import { DocumentWidgetCard } from './DocumentWidgetCard';
import { useUpdateArtifactWidget } from './useUpdateArtifactWidget';

// eslint-disable-next-line sonarjs/function-return-type -- intentional: returns JSX or string, both valid ReactNode
function getStatusLabel(
  artifactId: string,
  isStreaming: boolean,
  t: TFunction<'chat'>,
): ReactNode {
  if (!isStreaming && artifactId) {
    return (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.update_jsx.updated')}
      </span>
    );
  }
  if (isStreaming) {
    return t('chat.tools.update_jsx.generating');
  }
  return t('chat.tools.update_jsx.title');
}

interface UpdateJsxWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function UpdateJsxWidget({
  content,
  isStreaming = false,
  onOpenArtifact,
}: UpdateJsxWidgetProps) {
  const { t } = useTranslation('chat');
  const { artifactId, handleOpen } = useUpdateArtifactWidget(
    content,
    onOpenArtifact,
  );

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={t('chat.tools.update_jsx.title')}
      statusLabel={getStatusLabel(artifactId, isStreaming, t)}
      buttonLabel={t('chat.tools.update_jsx.openInEditor')}
      artifactId={artifactId || null}
      onOpen={handleOpen}
      icon={Code}
    />
  );
}
