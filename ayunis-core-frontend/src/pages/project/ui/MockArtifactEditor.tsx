import { ArtifactEditor } from '@/widgets/artifact-editor';
import { showInfo } from '@/shared/lib/toast';
import type { ProjectDocument } from '@/entities/project';
import { toMockArtifact } from '../lib/toMockArtifact';
import { downloadDocument } from '../lib/downloadDocument';

interface MockArtifactEditorProps {
  document: ProjectDocument;
  onClose?: () => void;
}

export function MockArtifactEditor({
  document,
  onClose,
}: Readonly<MockArtifactEditorProps>) {
  return (
    <div className="h-full [&>div]:border-l-0">
      <ArtifactEditor
        artifact={toMockArtifact(document)}
        onSave={() => showInfo('Speichern wird im Prototyp nicht übernommen.')}
        onRevert={() =>
          showInfo('Versionswechsel wird im Prototyp nicht übernommen.')
        }
        onExport={() => downloadDocument(document)}
        onClose={onClose}
      />
    </div>
  );
}
