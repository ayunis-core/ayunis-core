import { describe, expect, it } from 'vitest';
import { buildOrgNameSchema } from './org-name';

const schema = buildOrgNameSchema((key) => key);

describe('buildOrgNameSchema', () => {
  it('trims the submitted name', () => {
    expect(schema.parse({ name: '  Acme Corporation  ' })).toEqual({
      name: 'Acme Corporation',
    });
  });

  it.each(['', '   '])('rejects the blank name %p', (name) => {
    const result = schema.safeParse({ name });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'orgDetails.validation.name.isNotEmpty',
    );
  });
});
