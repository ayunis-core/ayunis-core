import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListToolbar, ListToolbarSearch } from './ListToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ListToolbar', () => {
  it('provides a compact, labelled search and preserves page-owned changes', () => {
    const onChange = vi.fn();
    render(
      <ListToolbar data-testid="toolbar">
        <ListToolbarSearch
          placeholder="Search projects"
          value=""
          onChange={onChange}
        />
        <button>Create</button>
      </ListToolbar>,
    );
    const input = screen.getByRole('searchbox', { name: 'Search projects' });
    expect(input.classList.contains('h-8')).toBe(true);
    expect(input.classList.contains('h-9')).toBe(false);
    expect(input.classList.contains('text-sm')).toBe(false);
    expect(input.classList.contains('text-base')).toBe(true);
    expect(input.classList.contains('md:text-sm')).toBe(true);
    expect(screen.getByTestId('toolbar').classList.contains('flex-wrap')).toBe(
      true,
    );
    fireEvent.change(input, { target: { value: 'Permits' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'common.search.clear' }),
    ).toBeNull();
  });

  it('clears the search and keeps the caret in the field', () => {
    const onChange = vi.fn();
    render(
      <ListToolbarSearch
        placeholder="Search projects"
        value="Permits"
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('searchbox', { name: 'Search projects' });
    input.focus();
    fireEvent.click(
      screen.getByRole('button', { name: 'common.search.clear' }),
    );
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('');
    expect(document.activeElement).toBe(input);
  });
});
