import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PaneChatHistory } from './PaneChatHistory';

const history = vi.hoisted(() => ({ total: 21 }));
vi.mock('@/outlook/lib/use-pane-chat-data', () => ({
  PANE_HISTORY_PAGE_SIZE: 20,
  usePaneHistory: (offset: number) => ({
    data: {
      data:
        offset === 0
          ? [{ id: 'recent', title: 'Recent chat' }]
          : offset < history.total
            ? [{ id: 'older', title: 'Older chat' }]
            : [],
      pagination: { total: history.total },
    },
  }),
  usePaneThreadActions: () => ({}),
}));

it('returns to a valid history page when the last chat on the current page is deleted', () => {
  const view = (
    <PaneChatHistory capabilities={{}} onSelect={vi.fn()} onError={vi.fn()} />
  );
  const { rerender } = render(view);
  fireEvent.click(screen.getByTestId('outlook-history-next'));
  expect(screen.getByRole('button', { name: 'Older chat' })).toBeDefined();

  history.total = 20;
  rerender(
    <PaneChatHistory capabilities={{}} onSelect={vi.fn()} onError={vi.fn()} />,
  );

  expect(screen.getByRole('button', { name: 'Recent chat' })).toBeDefined();
  expect(screen.queryByText('emptyState.title')).toBeNull();
});
