import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PaneChatHistory } from './PaneChatHistory';

const history = vi.hoisted(() => ({
  total: 21,
  card: {
    createdAt: '2026-11-01T12:00:00Z',
    origin: { kind: 'chat' },
    isAnonymous: false,
  },
}));
vi.mock('@/outlook/lib/use-pane-chat-data', () => ({
  PANE_HISTORY_PAGE_SIZE: 20,
  usePaneHistory: (offset: number) => ({
    data: {
      data:
        offset === 0
          ? [{ ...history.card, id: 'recent', title: 'Recent chat' }]
          : offset < history.total
            ? [{ ...history.card, id: 'older', title: 'Older chat' }]
            : [],
      pagination: { total: history.total },
    },
  }),
  usePaneThreadActions: () => ({}),
}));

it('returns to a valid history page when the last chat on the current page is deleted', () => {
  const props = {
    capabilities: {},
    onSelect: vi.fn(),
    onError: vi.fn(),
    onBack: vi.fn(),
    onSignOut: vi.fn(async () => undefined),
    session: new AbortController().signal,
  };
  const view = <PaneChatHistory {...props} />;
  const { rerender } = render(view);
  fireEvent.click(screen.getByTestId('outlook-history-next'));
  expect(screen.getByRole('link', { name: 'Older chat' })).toBeDefined();

  history.total = 20;
  rerender(<PaneChatHistory {...props} />);

  expect(screen.getByRole('link', { name: 'Recent chat' })).toBeDefined();
  expect(screen.queryByText('emptyState.title')).toBeNull();
});
