import { BarChartWidget } from '@/widgets/charts';
import { SendEmailWidget } from '@/widgets/email-draft';
import type { ProjectDocument } from '@/entities/project';
import { MockArtifactEditor } from './MockArtifactEditor';
import { toMockToolUse } from '../lib/toMockToolUse';

interface MockWidgetViewProps {
  document: ProjectDocument;
  onClose?: () => void;
}

export function MockWidgetView({
  document,
  onClose,
}: Readonly<MockWidgetViewProps>) {
  if (document.kind !== 'chart' && document.kind !== 'email') {
    return <MockArtifactEditor document={document} onClose={onClose} />;
  }

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      <div className="min-w-0 px-3 pb-4">
        {document.kind === 'chart' ? (
          <BarChartWidget content={toMockToolUse(document)} />
        ) : (
          <SendEmailWidget content={toMockToolUse(document)} />
        )}
      </div>
    </div>
  );
}
