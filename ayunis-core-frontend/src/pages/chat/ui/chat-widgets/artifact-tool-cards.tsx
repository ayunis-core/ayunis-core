import type {
  ToolCardProps,
  ToolCardRegistration,
} from '@ayunis/chat/tool-cards';
import type { ComponentType } from 'react';
import CreateDocumentWidget from './CreateDocumentWidget';
import UpdateDocumentWidget from './UpdateDocumentWidget';
import EditDocumentWidget from './EditDocumentWidget';
import ReadDocumentWidget from './ReadDocumentWidget';
import CreateDiagramWidget from './CreateDiagramWidget';
import UpdateDiagramWidget from './UpdateDiagramWidget';
import CreateSpreadsheetWidget from './CreateSpreadsheetWidget';
import UpdateSpreadsheetWidget from './UpdateSpreadsheetWidget';

export type ArtifactFamily = 'document' | 'diagram' | 'spreadsheet';

interface ArtifactWidgetProps {
  readonly content: ToolCardProps['toolUse'];
  readonly result?: string;
  readonly isStreaming: boolean;
  readonly threadId: string;
  readonly onOpenArtifact?: ToolCardProps['onOpenArtifact'];
}

type ArtifactCardBehavior =
  | { readonly createsArtifact: true }
  | { readonly artifactFamily: ArtifactFamily };

function artifactCard(
  Widget: ComponentType<ArtifactWidgetProps>,
  labelKey: string,
  behavior: ArtifactCardBehavior,
): ToolCardRegistration<ArtifactFamily> {
  return {
    ...behavior,
    action: { labelKey, targetParams: ['title'] },
    render: ({
      toolUse,
      index,
      result,
      isStreaming,
      threadId,
      onOpenArtifact,
    }) => (
      <Widget
        key={`${toolUse.name.replaceAll('_', '-')}-${index}-${toolUse.name.slice(0, 50)}`}
        content={toolUse}
        result={result}
        isStreaming={isStreaming}
        threadId={threadId ?? ''}
        onOpenArtifact={onOpenArtifact}
      />
    ),
  };
}

export const artifactToolCards = {
  create_document: artifactCard(
    CreateDocumentWidget,
    'chat.timeline.actions.create_document',
    { createsArtifact: true },
  ),
  update_document: artifactCard(
    UpdateDocumentWidget,
    'chat.timeline.actions.update_document',
    { artifactFamily: 'document' },
  ),
  edit_document: artifactCard(
    EditDocumentWidget,
    'chat.timeline.actions.edit_document',
    { artifactFamily: 'document' },
  ),
  read_document: artifactCard(
    ReadDocumentWidget,
    'chat.timeline.actions.read_document',
    { artifactFamily: 'document' },
  ),
  create_diagram: artifactCard(
    CreateDiagramWidget,
    'chat.timeline.actions.create_diagram',
    { createsArtifact: true },
  ),
  update_diagram: artifactCard(
    UpdateDiagramWidget,
    'chat.timeline.actions.update_diagram',
    { artifactFamily: 'diagram' },
  ),
  create_spreadsheet: artifactCard(
    CreateSpreadsheetWidget,
    'chat.timeline.actions.create_spreadsheet',
    { createsArtifact: true },
  ),
  update_spreadsheet: artifactCard(
    UpdateSpreadsheetWidget,
    'chat.timeline.actions.update_spreadsheet',
    { artifactFamily: 'spreadsheet' },
  ),
};
