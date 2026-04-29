import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

const MIN_WINDOW_HOURS = 0.01;

interface CurrentFairUseLimit {
  limit: number;
  windowHours: number;
}

interface FairUseLimitEditState {
  limit: string;
  windowHours: string;
}

type FairUseLimitField = 'limit' | 'windowHours';

interface UseFairUseLimitEditorOptions {
  current: CurrentFairUseLimit | undefined;
  validationKeyPrefix: string;
}

interface FairUseLimitSaveValues {
  limit: number;
  windowHours: number;
}

function isValidLimit(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
}

function isValidWindowHours(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= MIN_WINDOW_HOURS;
}

function toEditState(
  current: CurrentFairUseLimit | undefined,
): FairUseLimitEditState {
  return {
    limit: String(current?.limit ?? ''),
    windowHours: String(current?.windowHours ?? ''),
  };
}

export default function useFairUseLimitEditor({
  current,
  validationKeyPrefix,
}: UseFairUseLimitEditorOptions) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const [edit, setEdit] = useState<FairUseLimitEditState | null>(null);

  const isEditing = edit !== null;
  const limitValue = isEditing ? edit.limit : String(current?.limit ?? '');
  const windowValue = isEditing
    ? edit.windowHours
    : String(current?.windowHours ?? '');

  function updateField(field: FairUseLimitField, value: string) {
    setEdit((prev) => ({ ...(prev ?? toEditState(current)), [field]: value }));
  }

  function handleSave(onSave: (values: FairUseLimitSaveValues) => void) {
    if (!edit) return;

    if (!isValidLimit(edit.limit)) {
      showError(t(`${validationKeyPrefix}.validationError.limit`));
      return;
    }
    if (!isValidWindowHours(edit.windowHours)) {
      showError(t(`${validationKeyPrefix}.validationError.windowHours`));
      return;
    }

    onSave({
      limit: Number(edit.limit),
      windowHours: Number(edit.windowHours),
    });
  }

  function handleCancel() {
    setEdit(null);
  }

  return {
    isEditing,
    limitValue,
    windowValue,
    updateField,
    handleSave,
    handleCancel,
    resetEdit: handleCancel,
  };
}
