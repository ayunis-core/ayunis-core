import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatsFilters from './ChatsFilters';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

describe(ChatsFilters.name, () => {
  afterEach(() => {
    vi.useRealTimers();
    navigate.mockClear();
  });

  it('removes the search param and resets the page', () => {
    vi.useFakeTimers();
    render(<ChatsFilters search="permits" />);
    fireEvent.click(screen.getByTestId('chats-search-clear'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const update = navigate.mock.calls[0]?.[0].search as (prev: {
      search?: string;
      page?: number;
    }) => { search?: string; page?: number };
    expect(update({ search: 'permits', page: 4 })).toEqual({
      search: undefined,
      page: undefined,
    });
  });
});
