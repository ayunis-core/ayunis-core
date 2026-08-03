import { describe, expect, it } from 'vitest';
import {
  findDuplicateHeaderIndexes,
  findOAuthAuthorizationHeaderIndexes,
} from './custom-config-field-validation';
import type { CustomConfigFieldFormData } from '../model/types';

function field(
  headerName: string,
  scope: CustomConfigFieldFormData['scope'],
): CustomConfigFieldFormData {
  return {
    key: crypto.randomUUID(),
    scope,
    label: 'Token',
    type: 'secret',
    headerName,
    prefix: '',
    required: true,
    help: '',
    value: '',
  };
}

describe('findDuplicateHeaderIndexes', () => {
  it('finds case-insensitive duplicates within the same scope', () => {
    const fields = [
      field('Authorization', 'organization'),
      field('authorization', 'organization'),
      field('X-Api-Key', 'user'),
    ];

    expect(findDuplicateHeaderIndexes(fields)).toEqual([0, 1]);
  });

  it('allows the same header in organization and user scopes', () => {
    const fields = [
      field('Authorization', 'organization'),
      field('Authorization', 'user'),
    ];

    expect(findDuplicateHeaderIndexes(fields)).toEqual([]);
  });
});

describe('findOAuthAuthorizationHeaderIndexes', () => {
  it('finds case-insensitive Authorization mappings for OAuth schemas', () => {
    expect(
      findOAuthAuthorizationHeaderIndexes([
        field('X-Tenant', 'organization'),
        field(' authorization ', 'user'),
      ]),
    ).toEqual([1]);
  });
});
