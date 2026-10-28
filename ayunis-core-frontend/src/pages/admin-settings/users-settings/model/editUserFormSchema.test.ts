import { describe, it, expect } from 'vitest';
import { createEditUserFormSchema } from './editUserFormSchema';

const schema = createEditUserFormSchema((key) => key);

function emailError(email: string) {
  const result = schema.safeParse({ name: 'Ada', email });
  return result.error?.issues[0]?.message;
}

describe('createEditUserFormSchema', () => {
  // The email field chains .min() into .pipe(z.email()) so the "required"
  // message wins for a blank field. Flattening it to z.email().min() reports
  // the format error first and silently changes what the user sees.
  it('reports the required message for a blank email', () => {
    expect(emailError('')).toBe('editUserDialog.emailRequired');
  });

  it('reports the invalid message for a malformed email', () => {
    expect(emailError('not-an-email')).toBe('editUserDialog.emailInvalid');
  });

  it('accepts a valid email', () => {
    expect(emailError('ada@example.com')).toBeUndefined();
  });
});
