import type { TFunction } from 'i18next';

const GENERIC_ERROR_KEY = 'integrations.validateIntegration.error';
const ERROR_WITH_REASON_KEY =
  'integrations.validateIntegration.errorWithReason';

export function resolveValidateIntegrationErrorMessage(
  t: TFunction,
  reason: string | undefined,
): string {
  const message = reason?.trim();
  if (!message) {
    return t(GENERIC_ERROR_KEY);
  }
  return t(ERROR_WITH_REASON_KEY, { message });
}
