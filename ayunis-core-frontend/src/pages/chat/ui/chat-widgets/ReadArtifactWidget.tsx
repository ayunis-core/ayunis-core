import {
  Check,
  FileText,
  Table,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import type { ArtifactFamily } from '@/pages/chat/ui/agent-run-timeline/lib/tool-classification';
import { DocumentWidgetCard } from './DocumentWidgetCard';

const READ_TOOL_ICONS: Record<ArtifactFamily, LucideIcon> = {
  document: FileText,
  diagram: Workflow,
  spreadsheet: Table,
};

interface ReadArtifactWidgetProps {
  readonly family: ArtifactFamily;
  readonly content: ToolUseMessageContent;
  readonly result?: string;
  readonly isStreaming?: boolean;
  readonly onOpenArtifact?: (artifactId: string) => void;
}

interface ReadArtifactResult {
  artifactId: string;
  title: string;
}

function parseReadResult(result?: string): ReadArtifactResult | null {
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

export default function ReadArtifactWidget({
  family,
  content,
  result,
  isStreaming = false,
  onOpenArtifact,
}: Readonly<ReadArtifactWidgetProps>) {
  const { t } = useTranslation('chat');
  const keys = `chat.tools.read_${family}`;
  const readResult = parseReadResult(result);
  const artifactId = readResult?.artifactId ?? null;
  let statusLabel: ReactNode = t(`${keys}.unavailable`);
  if (isStreaming) {
    statusLabel = t(`${keys}.reading`);
  }
  if (readResult) {
    statusLabel = (
      <span className="flex items-center gap-1">
        <Check className="size-3" />
        {t(`${keys}.available`)}
      </span>
    );
  }

  return (
    <DocumentWidgetCard
      contentKey={content.name}
      contentId={content.id}
      isStreaming={isStreaming}
      title={readResult?.title ?? t(`${keys}.title`)}
      statusLabel={statusLabel}
      buttonLabel={t(`${keys}.openInEditor`)}
      artifactId={artifactId}
      onOpen={() => artifactId && onOpenArtifact?.(artifactId)}
      icon={READ_TOOL_ICONS[family]}
    />
  );
}
