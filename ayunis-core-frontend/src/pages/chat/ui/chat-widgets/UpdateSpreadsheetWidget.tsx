import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Check, Table } from 'lucide-react';
import { DocumentWidgetCard } from './DocumentWidgetCard';
import { useUpdateArtifactWidget } from './useUpdateArtifactWidget';

interface UpdateSpreadsheetWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

export default function UpdateSpreadsheetWidget({
  content,
  isStreaming = false,
  onOpenArtifact,
}: UpdateSpreadsheetWidgetProps) {
  const { t } = useTranslation('chat');
  const { artifactId, handleOpen } = useUpdateArtifactWidget(
    content,
    onOpenArtifact,
  );

  const statusText = isStreaming
    ? t('chat.tools.update_spreadsheet.generating')
    : t('chat.tools.update_spreadsheet.title');
  const statusLabel =
    !isStreaming && artifactId ? (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.update_spreadsheet.updated')}
      </span>
    ) : (
      statusText
    );

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={t('chat.tools.update_spreadsheet.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.update_spreadsheet.openInEditor')}
      artifactId={artifactId || null}
      onOpen={handleOpen}
      icon={Table}
    />
  );
}
