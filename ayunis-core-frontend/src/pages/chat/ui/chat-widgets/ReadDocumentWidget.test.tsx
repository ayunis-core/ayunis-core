import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { renderRichToolCard } from '@/pages/chat/ui/agent-run-timeline/lib/render-rich-tool-card';
import ReadDocumentWidget from './ReadDocumentWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function readDocumentCall(): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'read-script-11',
    name: 'read_document',
    params: { artifact_id: 'artifact-11' },
  };
}

describe('ReadDocumentWidget', () => {
  it('opens the document from the registered read card through the host callback', () => {
    const onOpenArtifact = vi.fn();
    render(
      renderRichToolCard({
        toolUse: readDocumentCall(),
        result: JSON.stringify({
          artifactId: 'artifact-11',
          title: 'Script 11',
          version: 1,
        }),
        isStreaming: false,
        index: 0,
        onOpenArtifact,
      }),
    );

    expect(screen.getByText('Script 11')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.read_document.openInEditor',
      }),
    );
    expect(onOpenArtifact).toHaveBeenCalledWith('artifact-11');
  });

  it('does not expose a completed document when the read result is invalid', () => {
    render(
      <ReadDocumentWidget
        content={readDocumentCall()}
        result="Document could not be read"
      />,
    );

    expect(
      screen
        .getByRole('button', {
          name: 'chat.tools.read_document.openInEditor',
        })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.queryByText('chat.tools.read_document.available')).toBeNull();
  });
});
