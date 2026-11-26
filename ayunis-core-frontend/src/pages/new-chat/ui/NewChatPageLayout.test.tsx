import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import NewChatPageLayout from './NewChatPageLayout';

vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: Readonly<{ children: ReactNode }>) => (
    <main>{children}</main>
  ),
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe('NewChatPageLayout', () => {
  it('keeps a single main landmark when the host layout already owns it', () => {
    render(
      <NewChatPageLayout
        slots={{ header: () => <div>Header</div> }}
        composer={<textarea aria-label="Prompt" />}
      />,
    );

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
