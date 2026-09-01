import { ChevronLeft } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ArtifactEditor } from '@/widgets/artifact-editor';
import { showInfo } from '@/shared/lib/toast';
import { ARTIFACT_FIXTURE } from '@/pages/chat-context-prototype/model/artifact-fixture';

interface ArtifactPreviewBodyProps {
  onBack: () => void;
}

export function ArtifactPreviewBody({
  onBack,
}: Readonly<ArtifactPreviewBodyProps>) {
  return (
    <div className="flex animate-in flex-col gap-2 fade-in-0 slide-in-from-right-2 duration-200">
      <Button variant="ghost" size="sm" className="w-fit" onClick={onBack}>
        <ChevronLeft />
        Alle Ergebnisse
      </Button>
      <ArtifactEditor
        artifact={ARTIFACT_FIXTURE}
        onSave={() => showInfo('Gespeichert.')}
        onRevert={() => showInfo('Version wiederhergestellt.')}
        onExport={() => showInfo('Export startet hier.')}
        onClose={onBack}
      />
    </div>
  );
}
