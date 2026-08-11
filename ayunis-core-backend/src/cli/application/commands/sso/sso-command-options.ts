import type { UUID } from 'crypto';
import { isUUID } from 'class-validator';

export function parseBooleanOption(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new Error('Expected either true or false');
}

export function parseOrgIdOption(value: string): UUID {
  if (!isUUID(value)) {
    throw new Error('Expected a valid organization UUID');
  }
  return value.toLowerCase() as UUID;
}
