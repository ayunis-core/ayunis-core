import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { DocumentWidgetCard } from './DocumentWidgetCard';

interface ReadDocumentWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly result?: string;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

interface ReadDocumentResult {
  artifactId: string;
  title: string;
}

function parseReadResult(result?: string): ReadDocumentResult | null {
  if (!result) return null;
  try {
    const parsed: unknown = JSON.parse(result);
    if (!parsed || typeof parsed !== 'object') return null;
    const { artifactId, title } = parsed as Record<string, unknown>;
    return typeof artifactId === 'string' && typeof title === 'string'
      ? { artifactId, title }
      : null;
  } catch {
    return null;
  }
}

export default function ReadDocumentWidget({
  content,
  result,
  isStreaming = false,
  onOpenArtifact,
}: Readonly<ReadDocumentWidgetProps>) {
  const { t } = useTranslation('chat');
  const readResult = parseReadResult(result);
  const artifactId = readResult?.artifactId ?? null;
  let statusLabel: ReactNode = t('chat.tools.read_document.unavailable');
  if (isStreaming) {
    statusLabel = t('chat.tools.read_document.reading');
  }
  if (readResult) {
    statusLabel = (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t('chat.tools.read_document.available')}
      </span>
    );
  }

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={readResult?.title ?? t('chat.tools.read_document.title')}
      statusLabel={statusLabel}
      buttonLabel={t('chat.tools.read_document.openInEditor')}
      artifactId={artifactId}
      onOpen={() => artifactId && onOpenArtifact?.(artifactId)}
    />
  );
}
