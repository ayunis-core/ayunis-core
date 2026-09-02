import { Globe, Quote, Sparkles } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { DocumentWidgetCard } from '@/pages/chat/ui/chat-widgets/DocumentWidgetCard';
import {
  ARTIFACTS,
  CONTEXT_ITEMS,
  SOURCE_HITS,
  TRANSCRIPT,
} from '@/pages/chat-context-prototype/model/mock';

interface PrototypeTranscriptProps {
  transcriptIds: string[];
  onOpenContext: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onOpenSource: (sourceId: string) => void;
}

export function PrototypeTranscript({
  transcriptIds,
  onOpenContext,
  onOpenArtifact,
  onOpenSource,
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
}: Readonly<{
  entryId: string;
  onOpenContext: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onOpenSource: (sourceId: string) => void;
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
        <p className="text-sm leading-relaxed">{entry.text}</p>
        {entry.sourceIds && (
          <SourceBadges ids={entry.sourceIds} onOpen={onOpenSource} />
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
}: Readonly<{ ids: string[]; onOpen: (sourceId: string) => void }>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <Badge key={id} asChild variant="outline" className="cursor-pointer">
          <button type="button" onClick={() => onOpen(id)}>
            {SOURCE_HITS[id].kind === 'web' ? <Globe /> : <Quote />}
            {SOURCE_HITS[id].kind === 'web'
              ? SOURCE_HITS[id].siteName
              : SOURCE_HITS[id].title}
          </button>
        </Badge>
      ))}
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
