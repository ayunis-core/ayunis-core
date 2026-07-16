import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Table } from 'lucide-react';
import { useThreadArtifacts } from '../../api/useThreadArtifacts';
import { DocumentWidgetCard } from './DocumentWidgetCard';

interface CreateSpreadsheetWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function CreateSpreadsheetWidget({
  content,
  isStreaming = false,
  threadId,
  onOpenArtifact,
}: CreateSpreadsheetWidgetProps) {
  const { t } = useTranslation('chat');

  // params may be undefined mid-stream even though the type says otherwise
  const params = content.params as { title?: string } | undefined;
  const title = params?.title;

  const { artifacts } = useThreadArtifacts(threadId);
  const artifactId =
    artifacts
      .filter((a) => a.title === title && a.type === 'spreadsheet')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]?.id ?? null;

  const handleOpen = () => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  };

  const statusText = isStreaming
    ? t('chat.tools.create_spreadsheet.generating')
    : t('chat.tools.create_spreadsheet.title');
  const statusLabel = artifactId ? (
    <span className="flex items-center gap-1">
      <Check className="size-3" />
      {t('chat.tools.create_spreadsheet.created')}
    </span>
  ) : (
    statusText
  );

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={title ? title : t('chat.tools.create_spreadsheet.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.create_spreadsheet.openInEditor')}
      artifactId={artifactId}
      onOpen={handleOpen}
      icon={Table}
    />
  );
}
