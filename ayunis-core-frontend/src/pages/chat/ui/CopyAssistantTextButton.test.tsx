import { useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CopyAssistantTextButton from './CopyAssistantTextButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const trackOutcome = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/openpanel-outcomes', () => ({
  useTrackProductiveOutcome: () => trackOutcome,
}));

function CopyHarness() {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={contentRef}>
        <div data-copyable="true">
          Answer
          <span className="react-syntax-highlighter-line-number">9</span>
          alpha
          <span className="react-syntax-highlighter-line-number">10</span>
          beta
        </div>
      </div>
      <CopyAssistantTextButton contentRef={contentRef} />
    </>
  );
}

class ClipboardItemStub {
  constructor(private readonly items: Record<string, Blob>) {}

  getType(type: string): Promise<Blob> {
    return Promise.resolve(this.items[type]);
  }
}

describe('CopyAssistantTextButton', () => {
  beforeEach(() => {
    trackOutcome.mockReset();
  });

  it('copies the answer without code-block line numbers', async () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent ?? '';
      },
    });
    vi.stubGlobal('ClipboardItem', ClipboardItemStub);
    const captured: { html?: string; plain?: string } = {};
    const write = vi.fn(async (items: ClipboardItemStub[]) => {
      const item = items[0];
      captured.html = await (await item.getType('text/html')).text();
      captured.plain = await (await item.getType('text/plain')).text();
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });

    render(<CopyHarness />);
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );

    await waitFor(() => {
      expect(write).toHaveBeenCalled();
    });
    expect(captured.plain).toContain('Answer');
    expect(captured.plain).toContain('alpha');
    expect(captured.plain).toContain('beta');
    expect(captured.plain).not.toContain('9');
    expect(captured.plain).not.toContain('10');
    expect(captured.html).not.toContain('react-syntax-highlighter-line-number');
    expect(captured.html).toContain('alpha');
  });

  it('sends answer_copied once the plain-text fallback reached the clipboard', async () => {
    vi.stubGlobal('ClipboardItem', ClipboardItemStub);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: vi.fn().mockRejectedValue(new Error('no html')),
        writeText,
      },
    });

    render(<CopyHarness />);
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );

    await waitFor(() => {
      expect(trackOutcome.mock.calls).toEqual([
        [{ outcome_type: 'answer_copied', output_type: 'answer' }],
      ]);
    });
  });

  it('sends nothing when the clipboard rejected the copy', async () => {
    vi.stubGlobal('ClipboardItem', ClipboardItemStub);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: vi.fn().mockRejectedValue(new Error('denied')),
        writeText,
      },
    });

    render(<CopyHarness />);
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(trackOutcome).not.toHaveBeenCalled();
  });
});
