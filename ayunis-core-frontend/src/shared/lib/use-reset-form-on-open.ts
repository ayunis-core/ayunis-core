import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Re-seeds a form whenever a dialog transitions to open (and, if `key` is
 * given, whenever the key changes while open). `defaultValues` only apply on
 * mount, so a caller that keeps the dialog mounted would otherwise reopen it
 * showing the previous draft — or another entity's values. The reset runs in
 * an effect because react-hook-form notifies subscribers synchronously, which
 * React forbids during render; reading the seed through a ref keeps it fresh
 * without resetting on every prop change.
 */
export function useResetFormOnOpen<T extends FieldValues>(params: {
  form: UseFormReturn<T>;
  open: boolean;
  values: () => T;
  key?: string;
}) {
  const { form, open, key } = params;
  const valuesRef = useRef(params.values);

  useEffect(() => {
    valuesRef.current = params.values;
  });

  // Effects run in declaration order, so the seed callback above is already
  // fresh when this reset fires.
  useEffect(() => {
    if (open) {
      form.reset(valuesRef.current());
    }
  }, [form, open, key]);
}
