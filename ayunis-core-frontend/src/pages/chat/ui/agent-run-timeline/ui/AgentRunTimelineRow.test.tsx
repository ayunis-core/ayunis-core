import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import de from '@/shared/locales/de/chat.json';
import en from '@/shared/locales/en/chat.json';
import type { TimelineStep } from '@/pages/chat/ui/agent-run-timeline/model/types';
import AgentRunTimelineRow from './AgentRunTimelineRow';

vi.mock('@/widgets/markdown', () => ({
  PiiText: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function toolStep(
  status: 'streaming' | 'invalid',
): Extract<TimelineStep, { kind: 'tool' }> {
  return {
    kind: 'tool',
    key: 'tool-1',
    status: status === 'invalid' ? 'error' : 'in_progress',
    toolUse: {
      type: 'tool_use',
      id: 'tool-1',
      name: '',
      params: {},
      stream: {
        status,
        argumentsJson: '{"query":"part',
      },
    },
  };
}

async function renderRow(step: TimelineStep, language = 'en') {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: { de: { chat: de }, en: { chat: en } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <AgentRunTimelineRow step={step} />
    </I18nextProvider>,
  );
}

describe('AgentRunTimelineRow', () => {
  it('shows accumulated raw arguments while a tool call is streaming', async () => {
    await renderRow(toolStep('streaming'));

    fireEvent.click(screen.getByText(en.chat.timeline.preparingToolCall));

    expect(screen.getByText('{"query":"part')).toBeTruthy();
  });

  it('labels an invalid tool call as an error while keeping its raw input', async () => {
    await renderRow(toolStep('invalid'));

    fireEvent.click(screen.getByText(en.chat.timeline.invalidToolCall));

    expect(screen.getByText('{"query":"part')).toBeTruthy();
  });
});

const invalidCallCopy = [
  [
    'de',
    'Werkzeugaufruf fehlgeschlagen',
    'Das Modell hat einen fehlerhaften Werkzeugaufruf erzeugt. Versuchen Sie es erneut oder wählen Sie ein anderes Modell.',
  ],
  [
    'en',
    'Tool call failed',
    'The model produced a malformed tool call. Try again or choose a different model.',
  ],
] as const;

describe.each(invalidCallCopy)(
  'invalid tool calls in %s',
  (language, label, hint) => {
    it.each([true, false])(
      'shows the explanation before expanding (details: %s)',
      async (withDetails) => {
        const step = toolStep('invalid');
        if (step.kind === 'tool' && !withDetails) {
          step.toolUse.stream = { status: 'invalid', argumentsJson: '' };
        }
        await renderRow(step, language);
        expect(screen.getByText(label)).toBeTruthy();
        expect(screen.getByText(hint)).toBeTruthy();
        expect(screen.queryByText('{"query":"part')).toBeNull();
      },
    );

    it('keeps the advice separate from the expand control', async () => {
      await renderRow(toolStep('invalid'), language);
      const advice = screen.getByText(hint);

      fireEvent.click(advice);
      expect(screen.queryByText('{"query":"part')).toBeNull();
      expect(screen.getByRole('button', { name: label })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByText('{"query":"part')).toBeTruthy();
      expect(screen.getByText(hint)).toBeTruthy();
    });

    it.each(['streaming', 'done', 'thinking', 'skill_instruction'] as const)(
      'keeps %s steps free of the malformed-call explanation',
      async (kind) => {
        let step: TimelineStep = toolStep('streaming');
        if (kind === 'done') {
          step.status = 'done';
          step.result = 'Integration unavailable';
        } else if (kind === 'thinking') {
          step = {
            kind,
            key: 'thinking',
            status: 'done',
            transcript: 'Thinking',
          };
        } else if (kind === 'skill_instruction') {
          step = { kind, key: 'skill', status: 'done', text: 'Instructions' };
        }
        await renderRow(step, language);
        expect(screen.queryByText(label)).toBeNull();
        expect(screen.queryByText(hint)).toBeNull();
      },
    );
  },
);
