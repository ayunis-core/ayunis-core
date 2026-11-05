import { describe, expect, it } from 'vitest';
import { nextSort, sortFieldSchema, sortOrderSchema } from './table-sort';

describe('nextSort', () => {
  it('sorts a newly chosen column ascending', () => {
    expect(nextSort({}, 'name')).toEqual({ sortBy: 'name', sortOrder: 'asc' });
    expect(nextSort({ sortBy: 'email', sortOrder: 'desc' }, 'role')).toEqual({
      sortBy: 'role',
      sortOrder: 'asc',
    });
  });

  it('toggles the direction of the active column', () => {
    expect(nextSort({ sortBy: 'name', sortOrder: 'asc' }, 'name')).toEqual({
      sortBy: 'name',
      sortOrder: 'desc',
    });
    expect(nextSort({ sortBy: 'name', sortOrder: 'desc' }, 'name')).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });
});

describe('sort search schemas', () => {
  const fields = { name: 'name', email: 'email' } as const;

  it('accepts known values and drops unknown ones', () => {
    expect(sortFieldSchema(fields).parse('email')).toBe('email');
    expect(sortFieldSchema(fields).parse('passwordHash')).toBeUndefined();
    expect(sortOrderSchema.parse('desc')).toBe('desc');
    expect(sortOrderSchema.parse('sideways')).toBeUndefined();
  });
});
