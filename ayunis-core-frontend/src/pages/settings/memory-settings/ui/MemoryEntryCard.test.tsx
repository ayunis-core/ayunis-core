import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryEntryCard } from './MemoryEntryCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const entry = {
  key: 'personal',
  content: 'Works in the building authority',
  description: null,
  isReserved: true,
  updatedAt: '2026-11-01T10:00:00.000Z',
};

describe('MemoryEntryCard', () => {
  afterEach(cleanup);

  it('keeps the editor open with the draft when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <MemoryEntryCard
        entry={entry}
        isSaving={false}
        onSave={onSave}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('memory-entry-edit'));
    fireEvent.change(screen.getByTestId('memory-entry-input'), {
      target: { value: 'Head of the building authority' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('memory-entry-save'));
    });

    expect(onSave).toHaveBeenCalled();
    expect(screen.getByTestId('memory-entry-input')).toHaveProperty(
      'value',
      'Head of the building authority',
    );
  });
});
