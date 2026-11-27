import type { TFunction } from 'i18next';
import type { Path, UseFormReturn } from 'react-hook-form';
import type { FieldError } from '@/shared/api/extract-error-data';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';

/** Arrays take their own errors on `root`, as react-hook-form's field arrays do. */
export function doorErrorPath(field: string): string {
  return /(^buttons|\.answers)$/.test(field) ? `${field}.root` : field;
}

/** The message key of a field, the same for every button and answer. */
export function doorErrorKey(field: string): string {
  return field.replace(/\.\d+(?=\.|$)/g, '');
}

function messageFor(t: TFunction, field: string, constraint: string): string {
  const key = doorErrorKey(field);
  for (const candidate of [
    `validation.${key}.${constraint}`,
    `validation.${key}.invalid`,
  ]) {
    if (t(candidate) !== candidate) return t(candidate);
  }
  return t('validation.invalid');
}

export function setDoorValidationErrors(
  form: UseFormReturn<DoorFormFields>,
  errors: FieldError[],
  t: TFunction,
): void {
  for (const { field, constraints } of errors) {
    form.setError(doorErrorPath(field) as Path<DoorFormFields>, {
      message: messageFor(t, field, constraints[0]),
    });
  }
}
