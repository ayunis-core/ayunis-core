import { useState } from 'react';
import { getModeFromValue } from '@/widgets/model-select-options/lib/model-modes';

export function useModeSelection(
  serverValue: string | undefined,
  isSaving: boolean,
) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [wasSaving, setWasSaving] = useState(isSaving);

  if (wasSaving !== isSaving) {
    setWasSaving(isSaving);
    if (!isSaving && localValue !== null && !getModeFromValue(localValue)) {
      setLocalValue(null);
    }
  }

  return { selectedValue: localValue ?? serverValue, select: setLocalValue };
}
