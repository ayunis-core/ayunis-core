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

  it('keeps the typed text while the published search is still loading', () => {
    vi.useFakeTimers();
    const props = {
      onSearchChange: vi.fn(),
      translationNamespace: 'common',
      placeholderKey: 'common.search.clear',
      inputTestId: 'users-search',
    };
    const { rerender } = render(<UsersSearchWidget {...props} />);
    const input = screen.getByTestId<HTMLInputElement>('users-search');

    fireEvent.change(input, { target: { value: 'ann' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(props.onSearchChange).toHaveBeenCalledWith('ann');
    expect(input.value).toBe('ann');

    rerender(<UsersSearchWidget {...props} search="ann" />);
    expect(input.value).toBe('ann');
  });

  it('keeps newer typing when an earlier search finishes loading', () => {
    vi.useFakeTimers();
    const props = {
      onSearchChange: vi.fn(),
      translationNamespace: 'common',
      placeholderKey: 'common.search.clear',
      inputTestId: 'users-search',
    };
    const { rerender } = render(<UsersSearchWidget {...props} />);
    const input = screen.getByTestId<HTMLInputElement>('users-search');

    fireEvent.change(input, { target: { value: 'an' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.change(input, { target: { value: 'ann' } });
    rerender(<UsersSearchWidget {...props} search="an" />);

    expect(input.value).toBe('ann');
  });

  it('follows a search changed from outside the field', () => {
    const props = {
      onSearchChange: vi.fn(),
      translationNamespace: 'common',
      placeholderKey: 'common.search.clear',
      inputTestId: 'users-search',
    };
    const { rerender } = render(<UsersSearchWidget {...props} search="ada" />);

    rerender(<UsersSearchWidget {...props} search="bob" />);

    expect(screen.getByTestId<HTMLInputElement>('users-search').value).toBe(
      'bob',
    );
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
