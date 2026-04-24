import type { ReactNode } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import CreateDocumentWidget from './CreateDocumentWidget';
import UpdateDocumentWidget from './UpdateDocumentWidget';
import EditDocumentWidget from './EditDocumentWidget';
import CreateDiagramWidget from './CreateDiagramWidget';
import UpdateDiagramWidget from './UpdateDiagramWidget';
import CreateJsxWidget from './CreateJsxWidget';
import UpdateJsxWidget from './UpdateJsxWidget';

/**
 * Renders the chat widget for any document-, diagram-, or jsx-related tool
 * call. Returns null when the tool call is not an artifact tool, so the
 * caller can continue its switch with other widget types.
 */
// eslint-disable-next-line sonarjs/function-return-type -- returns JSX or null based on tool type
export function renderArtifactToolWidget(params: {
  content: ToolUseMessageContent;
  index: number;
  isStreaming?: boolean;
  threadId: string;
  onOpenArtifact?: (artifactId: string) => void;
}): ReactNode {
  const {
    content,
    index,
    isStreaming = false,
    threadId,
    onOpenArtifact,
  } = params;
  const keySuffix = `${index}-${content.name.slice(0, 50)}`;

  switch (content.name) {
    case ToolAssignmentDtoType.create_document:
      return (
        <CreateDocumentWidget
          key={`create-document-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          threadId={threadId}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.update_document:
      return (
        <UpdateDocumentWidget
          key={`update-document-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.edit_document:
      return (
        <EditDocumentWidget
          key={`edit-document-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.create_diagram:
      return (
        <CreateDiagramWidget
          key={`create-diagram-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          threadId={threadId}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.update_diagram:
      return (
        <UpdateDiagramWidget
          key={`update-diagram-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.create_jsx:
      return (
        <CreateJsxWidget
          key={`create-jsx-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          threadId={threadId}
          onOpenArtifact={onOpenArtifact}
        />
      );
    case ToolAssignmentDtoType.update_jsx:
      return (
        <UpdateJsxWidget
          key={`update-jsx-${keySuffix}`}
          content={content}
          isStreaming={isStreaming}
          onOpenArtifact={onOpenArtifact}
        />
      );
    default:
      return null;
  }
}
