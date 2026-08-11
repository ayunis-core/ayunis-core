import { useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Re-seeds a form whenever a dialog transitions to open (and, if `key` is
 * given, whenever the key changes while open). `defaultValues` only apply on
 * mount, so a caller that keeps the dialog mounted would otherwise reopen it
 * showing the previous draft — or another entity's values. Reading the seed
 * through a callback keeps it fresh without resetting on every prop change.
 */
export function useResetFormOnOpen<T extends FieldValues>(params: {
  form: UseFormReturn<T>;
  open: boolean;
  values: () => T;
  key?: string;
}) {
  const seed = `${params.key ?? ''}:${String(params.open)}`;
  const [previousSeed, setPreviousSeed] = useState(seed);
  if (previousSeed !== seed) {
    setPreviousSeed(seed);
    if (params.open) {
      params.form.reset(params.values());
    }
  }
}
