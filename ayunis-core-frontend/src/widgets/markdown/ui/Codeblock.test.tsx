import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CodeBlock from './Codeblock';

const theme = vi.hoisted(() => ({
  current: 'light',
}));

vi.mock('@/features/theme', () => ({
  useTheme: () => ({
    theme: theme.current,
    setTheme: () => undefined,
    toggleTheme: () => undefined,
  }),
}));

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

const MULTILINE = 'const a = 1;\nconst b = 2;';

function lineNumbers(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '.react-syntax-highlighter-line-number',
    ),
  ];
}

describe('CodeBlock line numbers', () => {
  beforeEach(() => {
    theme.current = 'light';
  });

  it.each(['light', 'dark'] as const)(
    'shows unselectable line numbers for multi-line blocks in the %s theme',
    (mode) => {
      theme.current = mode;

      render(<CodeBlock language="typescript">{MULTILINE}</CodeBlock>);

      expect(lineNumbers().map((number) => number.textContent)).toEqual([
        '1',
        '2',
      ]);
      for (const number of lineNumbers()) {
        expect(number.style.userSelect).toBe('none');
      }
      const background =
        document.querySelector<HTMLElement>('.relative > div')?.style
          .background;
      expect(background).toContain(
        mode === 'dark' ? '40, 44, 52' : '250, 250, 250',
      );
    },
  );

  it('does not show line numbers for a single-line block', () => {
    render(<CodeBlock language="typescript">{'const a = 1;\n'}</CodeBlock>);

    expect(lineNumbers()).toHaveLength(0);
    expect(document.querySelector('code')?.textContent).toBe('const a = 1;');
  });

  it('does not show line numbers for inline code', () => {
    render(<CodeBlock inline>{MULTILINE}</CodeBlock>);

    expect(lineNumbers()).toHaveLength(0);
    expect(document.querySelector('code')?.textContent).toBe(MULTILINE);
  });

  it('copies the source without line numbers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CodeBlock language="typescript">{MULTILINE}</CodeBlock>);
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(MULTILINE);
    });
  });
});
