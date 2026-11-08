import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRunUnit } from '@/pages/chat/ui/agent-run-timeline';
import AssistantRunBlock from './AssistantRunBlock';

const toggles = vi.hoisted(() => ({ readAloudEnabled: true }));

vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: (feature: string) =>
    feature === 'readAloudEnabled' && toggles.readAloudEnabled,
}));

vi.mock('@/features/language', () => ({
  useLanguage: () => ({ language: 'de' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/chat/ui/agent-run-timeline', () => ({
  AgentRunTimeline: () => <div data-copyable="true">Antwort</div>,
}));

function unit(overrides: Partial<AgentRunUnit> = {}): AgentRunUnit {
  return {
    kind: 'agent-run',
    key: 'run-a1',
    isStreaming: false,
    blocks: [
      {
        kind: 'text',
        key: 'a1-text-0',
        content: { type: 'text', text: 'Antwort' },
      },
    ],
    ...overrides,
  };
}

function readAloudButton() {
  return screen.queryByTestId('assistant-read-aloud');
}

describe('AssistantRunBlock read aloud', () => {
  beforeEach(() => {
    toggles.readAloudEnabled = true;
  });

  it('offers read aloud under a completed answer', () => {
    render(<AssistantRunBlock unit={unit()} isGroupedWithPrevious={false} />);

    expect(readAloudButton()).not.toBeNull();
    expect(readAloudButton()?.getAttribute('aria-label')).toBe(
      'chat.readAloud',
    );
  });

  it('hides read aloud while the answer is streaming', () => {
    render(
      <AssistantRunBlock
        unit={unit({ isStreaming: true })}
        isGroupedWithPrevious={false}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud for a run without text', () => {
    render(
      <AssistantRunBlock
        unit={unit({
          blocks: [{ kind: 'routine-finished', key: 'a1-finished' }],
        })}
        isGroupedWithPrevious={false}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud for an answer that is only code', () => {
    render(
      <AssistantRunBlock
        unit={unit({
          blocks: [
            {
              kind: 'text',
              key: 'a1-text-0',
              content: { type: 'text', text: '```bash\npnpm install\n```\n' },
            },
          ],
        })}
        isGroupedWithPrevious={false}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud when it is not enabled', () => {
    toggles.readAloudEnabled = false;

    render(<AssistantRunBlock unit={unit()} isGroupedWithPrevious={false} />);

    expect(readAloudButton()).toBeNull();
  });
});
