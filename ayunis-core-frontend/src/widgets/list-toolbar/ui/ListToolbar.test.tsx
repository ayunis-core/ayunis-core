import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListToolbar, ListToolbarSearch } from './ListToolbar';

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
  });
});
