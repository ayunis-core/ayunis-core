import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRunUnit } from '@ayunis/chat/timeline';
import { createRef } from 'react';
import { ReadAloudAction } from './ReadAloudAction';

const toggles = vi.hoisted(() => ({ readAloudEnabled: true }));

vi.mock('./use-read-aloud-enabled', () => ({
  useReadAloudEnabled: () => toggles.readAloudEnabled,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de' },
  }),
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

const contentRef = createRef<HTMLDivElement>();

describe('ReadAloudAction read aloud', () => {
  beforeEach(() => {
    toggles.readAloudEnabled = true;
  });

  it('offers read aloud under a completed answer', () => {
    render(<ReadAloudAction unit={unit()} contentRef={contentRef} />);

    expect(readAloudButton()).not.toBeNull();
    expect(readAloudButton()?.getAttribute('aria-label')).toBe(
      'chat.readAloud',
    );
  });

  it('hides read aloud while the answer is streaming', () => {
    render(
      <ReadAloudAction
        unit={unit({ isStreaming: true })}
        contentRef={contentRef}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud for a run without text', () => {
    render(
      <ReadAloudAction
        unit={unit({
          blocks: [{ kind: 'routine-finished', key: 'a1-finished' }],
        })}
        contentRef={contentRef}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud for an answer that is only code', () => {
    render(
      <ReadAloudAction
        unit={unit({
          blocks: [
            {
              kind: 'text',
              key: 'a1-text-0',
              content: { type: 'text', text: '```bash\npnpm install\n```\n' },
            },
          ],
        })}
        contentRef={contentRef}
      />,
    );

    expect(readAloudButton()).toBeNull();
  });

  it('hides read aloud when it is not enabled', () => {
    toggles.readAloudEnabled = false;

    render(<ReadAloudAction unit={unit()} contentRef={contentRef} />);

    expect(readAloudButton()).toBeNull();
  });
});
