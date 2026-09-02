import { Globe, Quote, Sparkles } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { cn } from '@ayunis/ui/lib/cn';
import { DocumentWidgetCard } from '@/pages/chat/ui/chat-widgets/DocumentWidgetCard';
import { Markdown } from '@/widgets/markdown';
import {
  ALL_SOURCE_HITS,
  ARTIFACTS,
  CONTEXT_ITEMS,
  TRANSCRIPT,
} from '@/pages/chat-context-prototype/model/mock';

interface PrototypeTranscriptProps {
  transcriptIds: string[];
  onOpenContext: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onOpenSourceList: (sourceIds: string[]) => void;
}

export function PrototypeTranscript({
  transcriptIds,
  onOpenContext,
  onOpenArtifact,
  onOpenSource,
  onOpenSourceList,
}: Readonly<PrototypeTranscriptProps>) {
  if (transcriptIds.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">
        Stellen Sie Ihre Frage, um zu beginnen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {transcriptIds.map((id) => (
        <TranscriptRow
          key={id}
          entryId={id}
          onOpenContext={onOpenContext}
          onOpenArtifact={onOpenArtifact}
          onOpenSource={onOpenSource}
          onOpenSourceList={onOpenSourceList}
        />
      ))}
    </div>
  );
}

function TranscriptRow({
  entryId,
  onOpenContext,
  onOpenArtifact,
  onOpenSource,
  onOpenSourceList,
}: Readonly<{
  entryId: string;
  onOpenContext: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onOpenSourceList: (sourceIds: string[]) => void;
}>) {
  const entry = TRANSCRIPT[entryId];
  if (entry.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl rounded-2xl bg-muted px-4 py-2.5 text-sm">
          {entry.text}
        </div>
      </div>
    );
  }
  if (entry.kind === 'assistant') {
    return (
      <div className="flex flex-col gap-2">
        <Markdown>{entry.text}</Markdown>
        {entry.sourceIds && (
          <SourceBadges
            ids={entry.sourceIds}
            onOpen={onOpenSource}
            onOpenAll={onOpenSourceList}
          />
        )}
      </div>
    );
  }
  if (entry.kind === 'activation') {
    return (
      <ActivationNote
        contextItemId={entry.contextItemId}
        onOpenContext={onOpenContext}
      />
    );
  }
  return <ArtifactCard artifactId={entry.artifactId} onOpen={onOpenArtifact} />;
}

function SourceBadges({
  ids,
  onOpen,
  onOpenAll,
}: Readonly<{
  ids: string[];
  onOpen: (sourceId: string) => void;
  onOpenAll: (sourceIds: string[]) => void;
}>) {
  if (ids.length > 3) {
    return (
      <Badge
        asChild
        variant="outline"
        className="w-fit cursor-pointer gap-2 pl-1.5"
      >
        <button type="button" onClick={() => onOpenAll(ids)}>
          <span className="flex items-center">
            {ids.slice(0, 3).map((id, index) => (
              <span
                key={id}
                className={cn(
                  'flex size-4 items-center justify-center rounded-full border bg-background text-muted-foreground [&_svg]:size-2.5',
                  index > 0 && '-ml-1.5',
                )}
              >
                {ALL_SOURCE_HITS[id].kind === 'web' ? <Globe /> : <Quote />}
              </span>
            ))}
          </span>
          {ids.length} Quellen
        </button>
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {ids.map((id) => {
        const hit = ALL_SOURCE_HITS[id];
        if (hit.kind === 'web') {
          return (
            <a
              key={id}
              href={hit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline [&_svg]:size-3"
            >
              <Globe />
              {hit.siteName}
            </a>
          );
        }
        return (
          <Badge key={id} asChild variant="outline" className="cursor-pointer">
            <button type="button" onClick={() => onOpen(id)}>
              <Quote />
              {hit.title}
            </button>
          </Badge>
        );
      })}
    </div>
  );
}

function ActivationNote({
  contextItemId,
  onOpenContext,
}: Readonly<{ contextItemId: string; onOpenContext: () => void }>) {
  const item = CONTEXT_ITEMS[contextItemId];
  return (
    <Badge asChild variant="ghost" className="w-fit cursor-pointer px-0">
      <button type="button" onClick={onOpenContext}>
        <Sparkles className="text-brand" />
        <span>
          Fähigkeit <span className="font-medium">{item.name}</span> aktiviert
        </span>
      </button>
    </Badge>
  );
}

function ArtifactCard({
  artifactId,
  onOpen,
}: Readonly<{ artifactId: string; onOpen: (artifactId: string) => void }>) {
  const artifact = ARTIFACTS[artifactId];
  return (
    <DocumentWidgetCard
      contentKey="prototype"
      contentId={artifactId}
      title={artifact.name}
      statusLabel="Dokument erstellt"
      buttonLabel="Öffnen"
      artifactId={artifactId}
      onOpen={() => onOpen(artifactId)}
    />
  );
}
