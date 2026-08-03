import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentRunUnit } from '../model/types';
import { renderRichToolCard } from '../lib/render-rich-tool-card';
import AgentRunTimeline from './AgentRunTimeline';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/widgets/markdown', () => ({
  Markdown: ({ children }: { children: string }) => (
    <div data-testid={`text-${children}`}>{children}</div>
  ),
}));

vi.mock('./AgentRunTimelineRow', () => ({
  default: ({ step }: { step: { key: string } }) => (
    <div data-testid={`step-${step.key}`} />
  ),
}));

vi.mock('../lib/render-rich-tool-card', () => ({
  renderRichToolCard: vi.fn(() => <div data-testid="rich-card" />),
}));

vi.mock('@/pages/chat/ui/ResponseStartOrb', () => ({
  default: () => <div data-testid="response-start-orb" />,
}));

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
      step: {
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
    },
    {
      kind: 'text',
      key: 'text-after',
      content: { type: 'text', text: 'after' },
    },
  ],
};

describe('AgentRunTimeline', () => {
  it('renders a rich tool row and card inline between surrounding text', () => {
    render(<AgentRunTimeline unit={unit} />);

    const before = screen.getByTestId('text-before');
    const tool = screen.getByTestId('step-tool-rich-1');
    const card = screen.getByTestId('rich-card');
    const after = screen.getByTestId('text-after');

    expect(screen.queryByTestId('step-tool-ordinary-1')).toBeNull();
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
          step: {
            ...pendingStep,
            toolUse: { ...pendingStep.toolUse, name: 'bar_chart' },
          },
        },
      ],
    };

    const { rerender } = render(<AgentRunTimeline unit={pendingUnit} />);
    const pendingRow = screen.getByTestId('step-tool-streaming');
    expect(screen.queryByTestId('rich-card')).toBeNull();

    rerender(<AgentRunTimeline unit={resolvedUnit} />);

    expect(screen.getByTestId('step-tool-streaming')).toBe(pendingRow);
    expect(screen.getByTestId('rich-card')).toBeTruthy();
  });

  it('does not render the response-start orb after timeline content exists', () => {
    render(<AgentRunTimeline unit={{ ...unit, isStreaming: true }} />);

    expect(screen.queryByTestId('response-start-orb')).toBeNull();
    expect(vi.mocked(renderRichToolCard)).toHaveBeenLastCalledWith(
      expect.objectContaining({ isStreaming: false }),
    );
  });

  it('renders a continuation indicator after a completed tool while streaming', () => {
    const blocksThroughRichTool = unit.blocks.slice(0, 3);
    render(
      <AgentRunTimeline
        unit={{ ...unit, blocks: blocksThroughRichTool, isStreaming: true }}
      />,
    );

    const card = screen.getByTestId('rich-card');
    const orb = screen.getByTestId('response-start-orb');
    expect(card.compareDocumentPosition(orb)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(vi.mocked(renderRichToolCard)).toHaveBeenLastCalledWith(
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

    render(<AgentRunTimeline unit={activeToolUnit} />);

    expect(screen.queryByTestId('response-start-orb')).toBeNull();
  });
});
