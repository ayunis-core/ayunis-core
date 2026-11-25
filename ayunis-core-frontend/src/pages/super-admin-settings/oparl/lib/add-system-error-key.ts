const URL_ERROR_KEYS: Record<string, string> = {
  OPARL_INVALID_SYSTEM_URL: 'add.errors.invalidUrl',
  OPARL_HOST_BLOCKED: 'add.errors.hostBlocked',
  OPARL_NOT_AN_OPARL_SYSTEM: 'add.errors.notOparl',
  OPARL_INVALID_RESPONSE: 'add.errors.notOparl',
  OPARL_REQUEST_FAILED: 'add.errors.unreachable',
  OPARL_SYSTEM_ALREADY_EXISTS: 'add.errors.alreadyExists',
};

/** The message for an error code of adding a system that concerns the URL; `null` for others. */
export function addSystemErrorKey(code: string | undefined): string | null {
  return (code && URL_ERROR_KEYS[code]) || null;
}
