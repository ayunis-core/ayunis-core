import type { OwnerOption } from '@/features/resource-ownership/model/types';

export interface OwnerOptionGroup {
  key: 'personal' | 'orgAndTeams';
  options: OwnerOption[];
}

/** Splits owner options into personal and organisation-and-team ones. */
export function groupOwnerOptions(
  options: readonly OwnerOption[],
): OwnerOptionGroup[] {
  const groups: OwnerOptionGroup[] = [
    {
      key: 'personal',
      options: options.filter(
        (option) => option.selection.ownerType === 'personal',
      ),
    },
    {
      key: 'orgAndTeams',
      options: options.filter(
        (option) => option.selection.ownerType !== 'personal',
      ),
    },
  ];
  return groups.filter((group) => group.options.length > 0);
}
