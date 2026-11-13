import { describe, expect, it } from 'vitest';
import { createApiKeyFormSchema } from './createApiKeyFormSchema';
import { editApiKeyFormSchema } from './editApiKeyFormSchema';

const t = (key: string) => key;

function localMidnight(offsetDays: number): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
  );
}

describe.each([
  ['create', createApiKeyFormSchema(t)],
  ['edit', editApiKeyFormSchema(t)],
])('%s form expiry date', (_label, schema) => {
  const base = { name: 'Citizen portal', description: '' };

  it('accepts today, since the key expires at the end of the day', () => {
    expect(
      schema.safeParse({ ...base, expiresAt: localMidnight(0) }).success,
    ).toBe(true);
  });

  it('rejects yesterday', () => {
    expect(
      schema.safeParse({ ...base, expiresAt: localMidnight(-1) }).success,
    ).toBe(false);
  });
});
