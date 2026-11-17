import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { PaneThreadRow } from '@/outlook/ui/PaneThreadRow';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

describe('PaneThreadRow', () => {
  it('deletes once however often the confirm button is clicked', () => {
    // The row stays mounted until the request answers; a second delete would
    // 404 and report a failure for a chat that was deleted successfully.
    const onDelete = vi.fn(() => new Promise<void>(() => undefined));
    render(
      <PaneThreadRow
        thread={
          {
            id: 'thread-1',
            title: 'Angebot',
            updatedAt: '2026-11-17T10:00:00.000Z',
          } as GetThreadsResponseDtoItem
        }
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('outlook-pane-thread-delete'));
    const confirm = screen.getByTestId('outlook-pane-thread-delete-confirm');
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
