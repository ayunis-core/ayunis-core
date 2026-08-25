import { ChevronLeft, ExternalLink, Maximize2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  SOURCE_HITS,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';

interface SourcePanelBodyProps {
  sourceId: string;
  onBack: () => void;
  onExpand: () => void;
}

export function SourcePanelBody({
  sourceId,
  onBack,
  onExpand,
}: Readonly<SourcePanelBodyProps>) {
  const hit = SOURCE_HITS[sourceId];
  return (
    <div className="flex animate-in flex-col gap-3 fade-in-0 slide-in-from-right-2 duration-200">
      <Button variant="ghost" size="sm" className="w-fit" onClick={onBack}>
        <ChevronLeft />
        Kontext
      </Button>
      <div className="flex flex-col">
        <h3 className="text-sm font-medium">{hit.title}</h3>
        <span className="text-xs text-muted-foreground">{subline(hit)}</span>
      </div>
      <p className="whitespace-pre-wrap border-l-2 border-brand bg-brand/15 py-2 pl-3 text-sm leading-relaxed">
        {hit.passage}
      </p>
      {hit.kind === 'document' ? (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={onExpand}
        >
          <Maximize2 />
          Im Dokument lesen
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="w-fit" asChild>
          <a href={hit.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Link aufrufen
          </a>
        </Button>
      )}
    </div>
  );
}

function subline(hit: SourceHit): string {
  if (hit.kind === 'document') return hit.location;
  return `${hit.siteName} · ${hit.retrievedAt}`;
}
