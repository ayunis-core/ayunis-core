import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableTableHead } from './SortableTableHead';

function renderHead(sort: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
  const onSort = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <SortableTableHead
            field="name"
            sort={sort}
            onSort={onSort}
            data-testid="head"
          >
            Name
          </SortableTableHead>
        </tr>
      </thead>
    </table>,
  );
  return { onSort, head: screen.getByTestId('head') };
}

describe(SortableTableHead.name, () => {
  it('marks an inactive column as unsorted and sorts it ascending on click', () => {
    const { onSort, head } = renderHead({ sortBy: 'email', sortOrder: 'asc' });

    expect(head.getAttribute('aria-sort')).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledWith({ sortBy: 'name', sortOrder: 'asc' });
  });

  it('reflects the active direction and flips it on click', () => {
    const { onSort, head } = renderHead({ sortBy: 'name', sortOrder: 'asc' });

    expect(head.getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledWith({ sortBy: 'name', sortOrder: 'desc' });
  });
});
