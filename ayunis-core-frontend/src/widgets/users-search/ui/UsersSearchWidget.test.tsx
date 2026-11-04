import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersSearchWidget } from './UsersSearchWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(UsersSearchWidget.name, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes an empty search after the field is cleared', () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    render(
      <UsersSearchWidget
        search="ada"
        onSearchChange={onSearchChange}
        translationNamespace="common"
        placeholderKey="common.search.clear"
        inputTestId="users-search"
      />,
    );

    fireEvent.click(screen.getByTestId('users-search-clear'));
    const input = screen.getByTestId('users-search');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('users search is not an input');
    }
    expect(input.value).toBe('');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).toHaveBeenCalledWith(undefined);
  });
});
