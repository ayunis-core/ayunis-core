import type { SourceCitation } from './source-citation';
import { useSourceCitationClick } from './source-citation-context';

const NAMED_CLASSES =
  'bg-muted text-foreground px-1 py-0.5 rounded font-medium underline underline-offset-2 cursor-pointer hover:bg-muted/70';
const NUMBERED_CLASSES =
  'not-prose inline-flex min-w-4 items-center justify-center rounded bg-muted px-1 align-middle text-[0.6875rem] leading-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/70 hover:text-foreground';

interface SourceCitationInlineProps {
  readonly citation: SourceCitation;
}

export default function SourceCitationInline({
  citation,
}: SourceCitationInlineProps) {
  const onCitationClick = useSourceCitationClick();

  if (!onCitationClick) {
    return (
      <span data-speech-text="">
        {`{{source:${citation.chunkId}|${citation.label}}}`}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-testid="source-citation"
      data-source-chunk-id={citation.chunkId}
      data-speech-text=""
      className={
        /^\d+$/.test(citation.label) ? NUMBERED_CLASSES : NAMED_CLASSES
      }
      onClick={() => onCitationClick(citation)}
    >
      {citation.label}
    </button>
  );
}
