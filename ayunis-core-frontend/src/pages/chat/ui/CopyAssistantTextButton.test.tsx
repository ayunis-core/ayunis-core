import { useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
