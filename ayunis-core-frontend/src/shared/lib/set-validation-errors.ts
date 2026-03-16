import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import type { TFunction } from 'i18next';
import type { FieldError } from '@/shared/api/extract-error-data';

/**
 * Maps backend validation errors to form field errors using translated messages.
 *
 * Translation keys are resolved as: `${translationPrefix}.${fieldName}.${constraint}`
 * For example: `validation.shortDescription.maxLength`
 *
 * Falls back to `${translationPrefix}.${fieldName}.invalid` if the specific
 * constraint key is missing, then to `${translationPrefix}.invalid` as a last resort.
 */
export function setValidationErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  errors: FieldError[],
  t: TFunction,
  translationPrefix: string,
): void {
  for (const { field, constraints } of errors) {
    const constraint = constraints[0];
    const specificKey = `${translationPrefix}.${field}.${constraint}`;
    const fieldFallbackKey = `${translationPrefix}.${field}.invalid`;
    const genericFallbackKey = `${translationPrefix}.invalid`;

    let message: string;
    if (t(specificKey) !== specificKey) {
      message = t(specificKey);
    } else if (t(fieldFallbackKey) !== fieldFallbackKey) {
      message = t(fieldFallbackKey);
    } else {
      message = t(genericFallbackKey);
    }

    form.setError(field as Path<T>, { message });
  }
}
