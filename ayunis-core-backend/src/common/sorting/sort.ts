export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export interface Sort<Field extends string> {
  field: Field;
  order: SortOrder;
}
