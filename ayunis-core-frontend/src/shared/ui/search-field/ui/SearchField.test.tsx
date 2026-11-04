import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import deCommon from '@/shared/locales/de/common.json';
import enCommon from '@/shared/locales/en/common.json';
import { SearchField } from './SearchField';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const clearLabel = 'common.search.clear';

describe(SearchField.name, () => {
  it('hides the clear control until the field contains text', () => {
    const { rerender } = render(
      <SearchField aria-label="Search" value="" onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: clearLabel })).toBeNull();

    rerender(
      <SearchField aria-label="Search" value="plan" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: clearLabel })).toBeTruthy();
  });

  it('clears on click and keeps focus in the field', () => {
    const onChange = vi.fn();
    render(
      <SearchField aria-label="Search" value="plan" onChange={onChange} />,
    );
    const input = screen.getByRole('searchbox', { name: 'Search' });
    input.focus();

    fireEvent.click(screen.getByRole('button', { name: clearLabel }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('clears a non-empty field on Escape and leaves an empty field alone', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchField aria-label="Search" value="plan" onChange={onChange} />,
    );
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search' }), {
      key: 'Escape',
    });
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('');

    onChange.mockClear();
    rerender(<SearchField aria-label="Search" value="" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search' }), {
      key: 'Escape',
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses a search field without the browser-native cancel icon', () => {
    render(<SearchField aria-label="Search" value="plan" onChange={vi.fn()} />);
    const input = screen.getByRole('searchbox', { name: 'Search' });
    expect(input.getAttribute('type')).toBe('search');
    expect(input.className).toContain(
      '[&::-webkit-search-cancel-button]:appearance-none',
    );
  });

  it('translates the clear label in English and German', () => {
    expect(enCommon.common.search.clear).toBe('Clear search');
    expect(deCommon.common.search.clear).toBe('Suche löschen');
  });
});
