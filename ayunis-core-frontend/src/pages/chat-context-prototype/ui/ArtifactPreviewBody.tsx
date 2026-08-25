import { ChevronLeft, Download } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { showInfo } from '@/shared/lib/toast';
import { ARTIFACTS } from '@/pages/chat-context-prototype/model/mock';

interface ArtifactPreviewBodyProps {
  artifactId: string;
  onBack: () => void;
}

export function ArtifactPreviewBody({
  artifactId,
  onBack,
}: Readonly<ArtifactPreviewBodyProps>) {
  const artifact = ARTIFACTS[artifactId];
  return (
    <div className="flex animate-in flex-col gap-3 fade-in-0 slide-in-from-right-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft />
          Alle Ergebnisse
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => showInfo('Download startet hier.')}
        >
          <Download />
          Herunterladen
        </Button>
      </div>
      <h3 className="text-sm font-medium">{artifact.name}</h3>
      <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
        {artifact.preview}
      </p>
    </div>
  );
}
