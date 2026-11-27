import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentRunUnit } from '@ayunis/chat/timeline';
import type { ToolCardProps } from '@ayunis/chat/tool-cards';
import { AgentRunTimeline as SharedAgentRunTimeline } from '@ayunis/chat/timeline';
import AgentRunTimeline from './AgentRunTimeline';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@ayunis/chat/markdown', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Markdown: ({
    children,
    renderLegalReferences,
    renderSourceCitations,
    renderUrlReferences,
  }: {
    children: string;
    renderLegalReferences?: boolean;
    renderSourceCitations?: boolean;
    renderUrlReferences?: boolean;
  }) => (
    <div
      data-testid={`text-${children}`}
      data-legal-references={renderLegalReferences ? 'true' : 'false'}
      data-source-citations={renderSourceCitations ? 'true' : 'false'}
      data-url-references={renderUrlReferences ? 'true' : 'false'}
    >
      {children}
    </div>
  ),
}));

const renderCard = vi.hoisted(() => vi.fn<(props: ToolCardProps) => void>());
vi.mock(
  '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations',
  () => {
    function TestCard(props: ToolCardProps) {
      renderCard(props);
      return <div data-testid="rich-card" />;
    }
    return {
      chatToolCards: new Map([
        ['bar_chart', { render: TestCard }],
        ['edit_document', { render: TestCard, artifactFamily: 'document' }],
      ]),
    };
  },
);

/** The timeline as the conversation presents it, with its response-start orb. */
function OrbTimeline({ unit }: Readonly<{ unit: AgentRunUnit }>) {
  return (
    <SharedAgentRunTimeline
      unit={unit}
      presentation={{
        toolCards: chatToolCards,
        pendingIndicator: <div data-testid="response-start-orb" />,
      }}
    />
  );
}

const unit: AgentRunUnit = {
  kind: 'agent-run',
  key: 'run-1',
  isStreaming: false,
  blocks: [
    {
      kind: 'text',
      key: 'text-before',
      content: { type: 'text', text: 'before' },
    },
    {
      kind: 'activity',
      key: 'ordinary-activity',
      steps: [
        {
          kind: 'tool',
          key: 'tool-ordinary-1',
          status: 'done',
          toolUse: {
            type: 'tool_use',
            id: 'ordinary-1',
            name: 'internet_search',
            params: {},
          },
        },
      ],
    },
    {
      kind: 'rich-tool',
      key: 'tool-rich-1',
      steps: [
        {
          kind: 'tool',
          key: 'tool-rich-1',
          status: 'done',
          toolUse: {
            type: 'tool_use',
            id: 'rich-1',
            name: 'bar_chart',
            params: {},
          },
        },
      ],
    },
    {
      kind: 'text',
      key: 'text-after',
      content: { type: 'text', text: 'after' },
    },
  ],
};

describe('AgentRunTimeline', () => {
  it.each(['legal-references', 'source-citations', 'url-references'])(
    'enables %s for assistant text blocks',
    (reference) => {
      render(<AgentRunTimeline unit={unit} />);
      for (const block of ['before', 'after']) {
        expect(
          screen.getByTestId(`text-${block}`).getAttribute(`data-${reference}`),
        ).toBe('true');
      }
    },
  );

  it('renders a rich tool row and card inline between surrounding text', () => {
    render(<AgentRunTimeline unit={unit} />);

    const before = screen.getByTestId('text-before');
    const tool = screen.getByTestId('agent-run-tool-step');
    const card = screen.getByTestId('rich-card');
    const after = screen.getByTestId('text-after');

    expect(screen.queryByText('chat.tools.internet_search')).toBeNull();
    expect(before.compareDocumentPosition(tool)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(tool.compareDocumentPosition(card)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(card.compareDocumentPosition(after)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('preserves the tool row while a streamed name resolves to a rich tool', () => {
    const pendingStep = {
      kind: 'tool' as const,
      key: 'tool-streaming',
      status: 'in_progress' as const,
      toolUse: {
        type: 'tool_use' as const,
        id: 'streaming',
        name: '',
        params: {},
        stream: {
          status: 'streaming' as const,
          argumentsJson: '{"title":',
        },
      },
    };
    const pendingUnit: AgentRunUnit = {
      ...unit,
      isStreaming: true,
      blocks: [
        {
          kind: 'pending-tool',
          key: pendingStep.key,
          step: pendingStep,
        },
      ],
    };
    const resolvedUnit: AgentRunUnit = {
      ...unit,
      isStreaming: true,
      blocks: [
        {
          kind: 'rich-tool',
          key: pendingStep.key,
          steps: [
            {
              ...pendingStep,
              toolUse: { ...pendingStep.toolUse, name: 'bar_chart' },
            },
          ],
        },
      ],
    };

    const { rerender } = render(<AgentRunTimeline unit={pendingUnit} />);
    const pendingRow = screen.getByTestId('agent-run-tool-step');
    expect(screen.queryByTestId('rich-card')).toBeNull();

    rerender(<AgentRunTimeline unit={resolvedUnit} />);

    expect(screen.getByTestId('agent-run-tool-step')).toBe(pendingRow);
    expect(screen.getByTestId('rich-card')).toBeTruthy();
  });

  it('renders one card from the latest step of a merged rich-tool block', () => {
    const editStep = (id: string) => ({
      kind: 'tool' as const,
      key: `tool-${id}`,
      status: 'done' as const,
      toolUse: {
        type: 'tool_use' as const,
        id,
        name: 'edit_document',
        params: { artifact_id: 'art-1' },
      },
    });
    const mergedUnit: AgentRunUnit = {
      ...unit,
      blocks: [
        {
          kind: 'rich-tool',
          key: 'tool-e1',
          steps: [editStep('e1'), editStep('e2'), editStep('e3')],
        },
      ],
    };

    render(<AgentRunTimeline unit={mergedUnit} />);

    expect(screen.getAllByTestId('agent-run-tool-step')).toHaveLength(3);
    expect(screen.getAllByTestId('rich-card')).toHaveLength(1);
    expect(renderCard).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toolUse: expect.objectContaining({ id: 'e3' }),
      }),
    );
  });

  it('renders the card from the last step with an artifact id while a follow-up edit streams', () => {
    const mergedUnit: AgentRunUnit = {
      ...unit,
      isStreaming: true,
      blocks: [
        {
          kind: 'rich-tool',
          key: 'tool-e1',
          steps: [
            {
              kind: 'tool',
              key: 'tool-e1',
              status: 'done',
              toolUse: {
                type: 'tool_use',
                id: 'e1',
                name: 'edit_document',
                params: { artifact_id: 'art-1' },
              },
            },
            {
              kind: 'tool',
              key: 'tool-e2',
              status: 'in_progress',
              toolUse: {
                type: 'tool_use',
                id: 'e2',
                name: 'edit_document',
                params: {},
                stream: {
                  status: 'streaming',
                  argumentsJson: '{"artifact_id": "art-',
                },
              },
            },
          ],
        },
      ],
    };

    render(<AgentRunTimeline unit={mergedUnit} />);

    expect(renderCard).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toolUse: expect.objectContaining({
          id: 'e1',
          params: { artifact_id: 'art-1' },
        }),
        isStreaming: true,
      }),
    );
  });

  it('keeps completed activity expanded until assistant text arrives', () => {
    const activityBlock = {
      kind: 'activity' as const,
      key: 'completed-activity',
      steps: [
        {
          kind: 'tool' as const,
          key: 'completed-tool',
          status: 'done' as const,
          toolUse: {
            type: 'tool_use' as const,
            id: 'completed-tool',
            name: 'internet_search',
            params: {},
          },
        },
      ],
    };
    const { rerender } = render(
      <AgentRunTimeline
        unit={{ ...unit, blocks: [activityBlock], isStreaming: true }}
      />,
    );

    expect(screen.getByTestId('agent-run-tool-step')).toBeTruthy();

    rerender(
      <AgentRunTimeline
        unit={{
          ...unit,
          blocks: [
            activityBlock,
            {
              kind: 'text',
              key: 'assistant-answer',
              content: { type: 'text', text: 'answer' },
            },
          ],
          isStreaming: true,
        }}
      />,
    );

    expect(screen.queryByTestId('agent-run-tool-step')).toBeNull();
  });

  it('does not render the response-start orb after timeline content exists', () => {
    render(<OrbTimeline unit={{ ...unit, isStreaming: true }} />);

    expect(screen.queryByTestId('response-start-orb')).toBeNull();
    expect(renderCard).toHaveBeenLastCalledWith(
      expect.objectContaining({ isStreaming: false }),
    );
  });

  it('renders a continuation indicator after a completed tool while streaming', () => {
    const blocksThroughRichTool = unit.blocks.slice(0, 3);
    render(
      <OrbTimeline
        unit={{ ...unit, blocks: blocksThroughRichTool, isStreaming: true }}
      />,
    );

    const card = screen.getByTestId('rich-card');
    const orb = screen.getByTestId('response-start-orb');
    expect(card.compareDocumentPosition(orb)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(renderCard).toHaveBeenLastCalledWith(
      expect.objectContaining({ isStreaming: false }),
    );
  });

  it('does not duplicate the working indicator while a tool is in progress', () => {
    const activeToolUnit: AgentRunUnit = {
      ...unit,
      isStreaming: true,
      blocks: [
        {
          kind: 'activity',
          key: 'active-activity',
          steps: [
            {
              kind: 'tool',
              key: 'active-tool',
              status: 'in_progress',
              toolUse: {
                type: 'tool_use',
                id: 'active-tool',
                name: 'internet_search',
                params: {},
              },
            },
          ],
        },
      ],
    };

    render(<OrbTimeline unit={activeToolUnit} />);

    expect(screen.queryByTestId('response-start-orb')).toBeNull();
  });
});
