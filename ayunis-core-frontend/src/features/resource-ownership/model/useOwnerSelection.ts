import { useState } from 'react';
import { useOwnerOptions } from '@/features/resource-ownership/api/useOwnerOptions';
import {
  ownerOptionValue,
  toOwnerChoice,
} from '@/features/resource-ownership/lib/owner-copy';
import type {
  OwnedResourceKind,
  OwnerChoice,
  OwnerOption,
} from '@/features/resource-ownership/model/types';

export function useOwnerSelection(kind: OwnedResourceKind) {
  const { options, orgEditorsIncludeNonAdmins, isLoading } =
    useOwnerOptions(kind);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const selected: OwnerOption | undefined =
    options.find((option) => ownerOptionValue(option) === selectedValue) ??
    options.at(0);

  return {
    options,
    orgEditorsIncludeNonAdmins,
    isLoading,
    selected,
    choice: selected ? toOwnerChoice(selected) : undefined,
    select: (option: OwnerOption) => setSelectedValue(ownerOptionValue(option)),
    reset: () => setSelectedValue(null),
  };
}

export type OwnerSelection = ReturnType<typeof useOwnerSelection>;
export type { OwnerChoice };
