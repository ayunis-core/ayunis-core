import { z } from 'zod';
import { SortOrder } from '@/shared/api';

export interface TableSort<Field extends string> {
  sortBy?: Field;
  sortOrder?: SortOrder;
}

export function nextSort<Field extends string>(
  current: TableSort<Field>,
  field: Field,
): Required<TableSort<Field>> {
  if (current.sortBy === field && current.sortOrder === SortOrder.asc) {
    return { sortBy: field, sortOrder: SortOrder.desc };
  }
  return { sortBy: field, sortOrder: SortOrder.asc };
}

export function sortFieldSchema<Fields extends Record<string, string>>(
  fields: Fields,
) {
  return z.enum(fields).optional().catch(undefined);
}

export const sortOrderSchema = z.enum(SortOrder).optional().catch(undefined);
