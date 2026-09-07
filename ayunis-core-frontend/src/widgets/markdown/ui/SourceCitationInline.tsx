import type { SourceCitation } from '@/widgets/markdown/lib/source-citation';
import { useSourceCitationClick } from '@/widgets/markdown/model/source-citation-context';

interface SourceCitationInlineProps {
  readonly citation: SourceCitation;
}

export default function SourceCitationInline({
  citation,
}: SourceCitationInlineProps) {
  const onCitationClick = useSourceCitationClick();

  if (!onCitationClick) {
    return <span>{`{{source:${citation.chunkId}|${citation.label}}}`}</span>;
  }

  return (
    <button
      type="button"
      data-testid="source-citation"
      data-source-chunk-id={citation.chunkId}
      className="bg-muted text-foreground px-1 py-0.5 rounded font-medium underline underline-offset-2 cursor-pointer hover:bg-muted/70"
      onClick={() => onCitationClick(citation)}
    >
      {citation.label}
    </button>
  );
}
